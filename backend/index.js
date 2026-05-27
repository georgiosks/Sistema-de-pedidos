const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); // NOVO: Importamos o fabricante de tokens
const cors = require('cors'); // Para permitir requisições do React
const PORT = process.env.PORT || 8080;

const app = express();
const prisma = new PrismaClient();

app.use(cors()); // Habilita requisições de qualquer origem
app.use(express.json());


// NOVO: A nossa palavra-passe secreta para validar os tokens (nunca partilhes isto na vida real!)
const SEGREDO = "minha_chave_super_secreta_123";

// --- ROTA DE LOGIN (Gera o Token) ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    // Simulação simples de administrador
    if (usuario === "admin" && senha === "admin123") {
        // Fabrica a "pulseira VIP" que dura 1 hora
        const token = jwt.sign({ id: 1, papel: "administrador" }, SEGREDO, { expiresIn: '1h' });
        return res.json({ mensagem: "Login com sucesso!", token });
    }

    res.status(401).json({ erro: "Usuário ou senha incorretos." }); // 401 Unauthorized 
});

// --- O NOSSO SEGURANÇA (Middleware) ---
// Esta função verifica se quem está a fazer o pedido tem a pulseira VIP
function verificarToken(req, res, next) {
    const cabecalhoAuth = req.headers['authorization']; // Procura o token na requisição

    if (!cabecalhoAuth) {
        return res.status(401).json({ erro: "Acesso negado. Token não fornecido." }); // 
    }

    // O token vem no formato "Bearer 123456...". Vamos separar para pegar só o código.
    const token = cabecalhoAuth.split(' ')[1];

    jwt.verify(token, SEGREDO, (err, decodificado) => {
        if (err) {
            return res.status(401).json({ erro: "Token inválido ou expirado." }); // 
        }
        // Se a pulseira for verdadeira, deixa o usuário passar (next)
        req.usuario = decodificado;
        next();
    });
}

// --- ROTAS DA API ---

// GET /produtos: Qualquer pessoa pode ver o cardápio (Não precisa de token)
app.get('/produtos', async (req, res) => {
    const produtos = await prisma.produto.findMany();
    res.json(produtos);
});

// PATCH /produtos/:id : Atualiza os dados de um produto (ex: mudar o preço)
app.patch('/produtos/:id', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, descricao, preco, categoria, disponivel } = req.body;

    try {
        // Primeiro, vê se o produto existe
        const produtoExiste = await prisma.produto.findUnique({ where: { id } });
        if (!produtoExiste) {
            return res.status(404).json({ erro: "Produto não encontrado." });
        }

        // Validação: Não aceitar preços negativos na atualização
        if (preco !== undefined && preco < 0) {
            return res.status(400).json({ erro: "O preço não pode ser negativo." });
        }

        // Atualiza o produto. Se um campo não for enviado no JSON, mantém o antigo
        const produtoAtualizado = await prisma.produto.update({
            where: { id },
            data: {
                nome: nome !== undefined ? nome : produtoExiste.nome,
                descricao: descricao !== undefined ? descricao : produtoExiste.descricao,
                preco: preco !== undefined ? preco : produtoExiste.preco,
                categoria: categoria !== undefined ? categoria : produtoExiste.categoria,
                disponivel: disponivel !== undefined ? disponivel : produtoExiste.disponivel
            }
        });

        res.json({ mensagem: "Produto atualizado com sucesso!", produto: produtoAtualizado });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor ao atualizar produto." });
    }
});

// DELETE /produtos/:id : "Desativa" o produto do cardápio (Soft Delete)
app.delete('/produtos/:id', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const produtoExiste = await prisma.produto.findUnique({ where: { id } });
        if (!produtoExiste) {
            return res.status(404).json({ erro: "Produto não encontrado." });
        }

        // Em vez de apagar do banco, apenas marcamos como indisponível
        const produtoDesativado = await prisma.produto.update({
            where: { id },
            data: { disponivel: false }
        });

        res.json({
            mensagem: "Produto desativado com sucesso! Ele não aparecerá mais para novos pedidos.",
            produto: produtoDesativado
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao desativar o produto." });
    }
});

// POST /produtos: PROTEGIDO! Só entra quem passar pelo 'verificarToken' 
app.post('/produtos', verificarToken, async (req, res) => {
    const { nome, descricao, preco, categoria, disponivel } = req.body;

    const novoProduto = await prisma.produto.create({
        data: { nome, descricao, preco, categoria, disponivel }
    });

    res.status(201).json(novoProduto); // 
});

// POST /clientes
app.post('/clientes', async (req, res) => {
    const { nome, telefone, endereco } = req.body;
    const novoCliente = await prisma.cliente.create({ data: { nome, telefone, endereco } });
    res.status(201).json(novoCliente); // 
});

// POST /pedidos: Com Cálculo Automático + Taxa de Entrega + Regra de Horário
app.post('/pedidos', async (req, res) => {

    // REGRA DE NEGÓCIO 1: Horário de Funcionamento (Ex: das 18h às 23h)
    // O Date().getHours() pega a hora atual do servidor
    const horaAtual = new Date().getHours();
    if (horaAtual < 13 || horaAtual > 23) {
        return res.status(400).json({ erro: "Estamos fechados! Horário de funcionamento: 18h às 23h." });
    }

    const { cliente_id, itens } = req.body;
    try {
        let valor_total_calculado = 0;

        for (let item of itens) {
            const produto = await prisma.produto.findUnique({ where: { id: item.produto_id } });
            if (!produto) return res.status(404).json({ erro: `Produto ID ${item.produto_id} não encontrado.` });

            // Verificação de estoque extra (Garantia de integridade)
            if (!produto.disponivel) return res.status(400).json({ erro: `O produto ${produto.nome} está indisponível.` });

            valor_total_calculado += produto.preco * item.quantidade;
        }

        // REGRA DE NEGÓCIO 2: Taxa de Entrega
        // Vamos fixar uma taxa de R$ 8.00 para este MVP
        const TAXA_ENTREGA = 8.00;
        valor_total_calculado += TAXA_ENTREGA;

        const novoPedido = await prisma.pedido.create({
            data: {
                cliente_id,
                valor_total: valor_total_calculado,
                status: "Pendente",
                itens: { create: itens.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade })) }
            },
            include: { itens: true }
        });

        res.status(201).json(novoPedido);
    } catch (error) {
        res.status(400).json({ erro: "Erro ao criar pedido." });
    }
});

// PATCH /pedidos/:id/status: Atualiza a situação do pedido
// Colocamos o 'verificarToken' porque alterar status é tarefa de funcionário!
app.patch('/pedidos/:id/status', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body; // Status que queremos aplicar (ex: "Cancelado", "Em Preparo")

    try {
        // Primeiro, vamos buscar o pedido atual para ver como ele está
        const pedido = await prisma.pedido.findUnique({ where: { id_pedido: id } });
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

        // REGRA DE NEGÓCIO 3: Política de Cancelamento
        if (status === "Cancelado" && pedido.status !== "Pendente") {
            return res.status(400).json({
                erro: "Atenção: Apenas pedidos 'Pendentes' podem ser cancelados pelo sistema. Este pedido já está em " + pedido.status
            });
        }

        // Se passar nas regras, atualizamos o banco de dados
        const pedidoAtualizado = await prisma.pedido.update({
            where: { id_pedido: id },
            data: { status }
        });

        res.json({ mensagem: "Status atualizado com sucesso!", pedido: pedidoAtualizado });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// GET /pedidos: Histórico completo (Apenas para Admin)
app.get('/pedidos', verificarToken, async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            include: {
                itens: true,
                // Opcional: Se quisesses ver o nome do cliente aqui, 
                // bastava adicionar 'cliente: true' (se a relação estiver configurada)
            },
            orderBy: { data_criacao: 'desc' } // Os mais recentes primeiro
        });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao procurar histórico." });
    }
});

// GET /relatorios/financeiro: O resumo do dia (Apenas para Admin)
app.get('/relatorios/financeiro', verificarToken, async (req, res) => {
    try {
        // Buscamos todos os pedidos que não foram cancelados
        const pedidos = await prisma.pedido.findMany({
            where: { status: { not: "Cancelado" } }
        });

        const totalFaturado = pedidos.reduce((soma, p) => soma + p.valor_total, 0);
        const totalPedidos = pedidos.length;

        res.json({
            mensagem: "Relatório gerado com sucesso",
            estatisticas: {
                total_pedidos: totalPedidos,
                faturacao_total: totalFaturado,
                ticket_medio: totalPedidos > 0 ? (totalFaturado / totalPedidos).toFixed(2) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao gerar relatório financeiro." });
    }
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor a rodar na porta ${PORT}`);
});