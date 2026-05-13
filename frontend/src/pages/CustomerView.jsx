import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShoppingCart, ChefHat, Plus, Minus, Trash2 } from 'lucide-react';

export default function CustomerView() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form estado
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const data = await api.get('/produtos');
      setProdutos(data.filter(p => p.disponivel));
    } catch (e) {
      console.error(e);
    }
  };

  const adicionarAoCarrinho = (produto) => {
    setCarrinho(prev => {
      const itemExistente = prev.find(item => item.produto.id === produto.id);
      if (itemExistente) {
        return prev.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const alterarQuantidade = (id, delta) => {
    setCarrinho(prev => prev.map(item => {
      if (item.produto.id === id) {
        const novaQtd = item.quantidade + delta;
        return novaQtd > 0 ? { ...item, quantidade: novaQtd } : item;
      }
      return item;
    }));
  };

  const removerDoCarrinho = (id) => {
    setCarrinho(prev => prev.filter(item => item.produto.id !== id));
  };

  const totalCarrinho = carrinho.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);

  const finalizarPedido = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      // 1. Criar Cliente
      const clienteRes = await api.post('/clientes', { nome, telefone, endereco });
      
      // 2. Criar Pedido
      const itensPedido = carrinho.map(item => ({
        produto_id: item.produto.id,
        quantidade: item.quantidade
      }));
      
      await api.post('/pedidos', {
        cliente_id: clienteRes.id,
        itens: itensPedido
      });
      
      setSucesso('Pedido realizado com sucesso!');
      setCarrinho([]);
      setIsModalOpen(false);
      setTimeout(() => setSucesso(''), 5000);
      
    } catch (err) {
      const msg = err.message ? JSON.parse(err.message).erro : 'Erro desconhecido';
      setErro(msg);
    }
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <header className="header">
        <div className="logo">
          <ChefHat size={32} />
          <span>GourmetApp</span>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsModalOpen(true)}
          disabled={carrinho.length === 0}
        >
          <ShoppingCart size={20} />
          Carrinho ({carrinho.reduce((acc, i) => acc + i.quantidade, 0)})
        </button>
      </header>

      <main className="container animate-fade-in">
        {sucesso && (
          <div style={{ background: 'var(--success)', color: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            {sucesso}
          </div>
        )}
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1>Nosso Cardápio</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Escolha os melhores pratos feitos com carinho.</p>
        </div>

        <div className="grid grid-cols-3">
          {produtos.map(produto => (
            <div key={produto.id} className="card">
              <h3 style={{ fontSize: '1.25rem' }}>{produto.nome}</h3>
              <p className="badge badge-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                {produto.categoria}
              </p>
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem', flexGrow: 1 }}>
                {produto.descricao}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <span className="price-tag">R$ {produto.preco.toFixed(2)}</span>
                <button className="btn btn-primary" onClick={() => adicionarAoCarrinho(produto)}>
                  Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal do Carrinho */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Seu Pedido</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {carrinho.length === 0 ? (
                <p>O carrinho está vazio.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {carrinho.map(item => (
                      <div key={item.produto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-hover)', padding: '1rem', borderRadius: '12px' }}>
                        <div style={{ flexGrow: 1 }}>
                          <h4 style={{ margin: 0 }}>{item.produto.nome}</h4>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>R$ {item.produto.preco.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button className="btn-icon" onClick={() => alterarQuantidade(item.produto.id, -1)}><Minus size={16}/></button>
                          <span style={{ width: '24px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantidade}</span>
                          <button className="btn-icon" onClick={() => alterarQuantidade(item.produto.id, 1)}><Plus size={16}/></button>
                          <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removerDoCarrinho(item.produto.id)}><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '2px dashed var(--border-color)', borderBottom: '2px dashed var(--border-color)', marginBottom: '1.5rem' }}>
                    <strong>Subtotal</strong>
                    <strong>R$ {totalCarrinho.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <strong>Taxa de Entrega</strong>
                    <strong>R$ 8.00</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', fontSize: '1.25rem', color: 'var(--primary)' }}>
                    <strong>Total Final</strong>
                    <strong>R$ {(totalCarrinho + 8).toFixed(2)}</strong>
                  </div>

                  <form onSubmit={finalizarPedido}>
                    <h3 style={{ marginBottom: '1rem' }}>Dados de Entrega</h3>
                    {erro && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{erro}</div>}
                    <div className="form-group">
                      <label className="form-label">Nome Completo</label>
                      <input required className="input" value={nome} onChange={e => setNome(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Telefone</label>
                      <input required className="input" value={telefone} onChange={e => setTelefone(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Endereço de Entrega</label>
                      <textarea required className="textarea" rows="2" value={endereco} onChange={e => setEndereco(e.target.value)}></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                      Finalizar e Pagar
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
