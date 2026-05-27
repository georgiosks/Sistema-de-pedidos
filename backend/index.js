const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); // Importamos o fabricante de tokens
const cors = require('cors'); // Para permitir requisições do React
const PORT = process.env.PORT || 3000;

const app = express();
const prisma = new PrismaClient();

app.use(cors()); // Habilita requisições de qualquer origem
app.use(express.json());

// Palavra-passe secreta para validar os tokens
const SEGREDO = "minha_chave_super_secreta_123";

// --- ROTA DE LOGIN (Gera o Token) ---
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === "admin" && senha === "admin123") {
        const token = jwt.sign({ id: 1, papel: "administrador" }, SEGREDO, { expiresIn: '1h' });
        return res.json({ mensagem: "Login com sucesso!", token });
    }

    res.status(401).json({ erro: "Usuário ou senha incorretos." });
});

// --- O NOSSO SEGURANÇA (Middleware) ---
function verificarToken(req, res, next) {
    const cabecalhoAuth = req.headers['authorization'];

    if (!cabecalhoAuth) {
        return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
    }

    const token = cabecalhoAuth.split(' ')[1];

    jwt.verify(token, SEGREDO, (err, decodificado) => {
        if (err) {
            return res.status(401).json({ erro: "Token inválido ou expirado." });
        }
        req.usuario = decodificado;
        next();
    });
}

// --- ROTA DE HEALTH CHECK (AGORA SIM!) ---
app.get('/ping', (req, res) => {
    res.send('O servidor está vivo e a internet está a passar!');
});

// --- ROTAS DA API ---

// GET /produtos: Ver o cardápio
app.get('/produtos', async (req, res) => {
    const produtos = await prisma.produto.findMany();
    res.json(produtos);
});

// PATCH /produtos/:id : Atualiza os dados de um produto
app.patch('/produtos/:id', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { nome, descricao, preco, categoria, disponivel } = req.body;

    try {
        const produtoExiste = await prisma.produto.findUnique({ where: { id } });
        if (!produtoExiste) {
            return res.status(404).json({ erro: "Produto não encontrado." });
        }

        if (preco !== undefined && preco < 0) {
            return res.status(400).json({ erro: "O preço não pode ser negativo." });
        }

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

        res.json({ mensagem: "Produto updated com sucesso!", produto: produtoAtualizado });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor ao atualizar produto." });
    }
});

// DELETE /produtos/:id : Soft Delete
app.delete('/produtos/:id', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);

    try {
        const produtoExiste = await prisma.produto.findUnique({ where: { id } });
        if (!produtoExiste) {
            return res.status(404).json({ erro: "Produto não encontrado." });
        }

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

// POST /produtos
app.post('/produtos', verificarToken, async (req, res) => {
    const { nome, descricao, preco, categoria, disponivel } = req.body;

    const novoProduto = await prisma.produto.create({
        data: { nome, descricao, preco, categoria, disponivel }
    });

    res.status(201).json(novoProduto);
});

// POST /clientes
app.post('/clientes', async (req, res) => {
    const { nome, telefone, endereco } = req.body;
    const novoCliente = await prisma.cliente.create({ data: { nome, telefone, endereco } });
    res.status(201).json(novoCliente);
});

// POST /pedidos
app.post('/pedidos', async (req, res) => {
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
            if (!produto.disponivel) return res.status(400).json({ erro: `O produto ${produto.nome} está indisponível.` });

            valor_total_calculado += produto.preco * item.quantidade;
        }

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

// PATCH /pedidos/:id/status
app.patch('/pedidos/:id/status', verificarToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    try {
        const pedido = await prisma.pedido.findUnique({ where: { id_pedido: id } });
        if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });

        if (status === "Cancelado" && pedido.status !== "Pendente") {
            return res.status(400).json({
                erro: "Atenção: Apenas pedidos 'Pendentes' podem ser cancelados pelo sistema. Este pedido já está em " + pedido.status
            });
        }

        const pedidoAtualizado = await prisma.pedido.update({
            where: { id_pedido: id },
            data: { status }
        });

        res.json({ mensagem: "Status atualizado com sucesso!", pedido: pedidoAtualizado });
    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// GET /pedidos: Histórico
app.get('/pedidos', verificarToken, async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            include: { itens: true },
            orderBy: { data_criacao: 'desc' }
        });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao procurar histórico." });
    }
});

// GET /relatorios/financeiro
app.get('/relatorios/financeiro', verificarToken, async (req, res) => {
    try {
        const pedidos = await prisma.pedido.findMany({
            where: { status: { not: "Cancelado" } }
        });

        const totalFaturado = pedidos.reduce((soma, p) => soma + p.valor_total, 0);
        const totalPedidos = pedidos.length;

        res.json({
            mensagem: "Relatório gerado com sucesso",
            statísticas: {
                total_pedidos: totalPedidos,
                faturacao_total: totalFaturado,
                ticket_medio: totalPedidos > 0 ? (totalFaturado / totalPedidos).toFixed(2) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao gerar relatório financeiro." });
    }
});

// Inicialização segura com conexão prévia ao Prisma
const iniciarServidor = async () => {
    try {
        await prisma.$connect();
        console.log("Conectado ao banco de dados com sucesso!");

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor a rodar na porta ${PORT}`);
        });
    } catch (error) {
        console.error("Erro fatal ao conectar:", error);
        process.exit(1);
    }
};

iniciarServidor();