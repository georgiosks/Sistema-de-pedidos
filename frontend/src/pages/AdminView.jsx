import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Lock, LayoutDashboard, Package, ShoppingBag, LogOut, Edit, Trash2, Plus } from 'lucide-react';

export default function AdminView() {
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [tab, setTab] = useState('dashboard');
  
  // Login State
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');

  // Dashboard Data
  const [relatorio, setRelatorio] = useState(null);
  
  // Pedidos Data
  const [pedidos, setPedidos] = useState([]);
  
  // Produtos Data
  const [produtos, setProdutos] = useState([]);
  
  // Edit Produto Modal
  const [produtoEdit, setProdutoEdit] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      if (tab === 'dashboard') carregarDashboard();
      if (tab === 'pedidos') carregarPedidos();
      if (tab === 'produtos') carregarProdutos();
    }
  }, [token, tab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { usuario, senha });
      setToken(res.token);
      localStorage.setItem('adminToken', res.token);
      setLoginErro('');
    } catch (err) {
      setLoginErro('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
  };

  const carregarDashboard = async () => {
    try {
      const data = await api.get('/relatorios/financeiro', token);
      setRelatorio(data.estatisticas);
    } catch (e) {
      if (e.message.includes('401')) handleLogout();
    }
  };

  const carregarPedidos = async () => {
    try {
      const data = await api.get('/pedidos', token);
      setPedidos(data);
    } catch (e) {}
  };

  const carregarProdutos = async () => {
    try {
      const data = await api.get('/produtos');
      setProdutos(data);
    } catch (e) {}
  };

  const atualizarStatusPedido = async (id, novoStatus) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status: novoStatus }, token);
      carregarPedidos();
    } catch (e) {
      alert(e.message ? JSON.parse(e.message).erro : 'Erro');
    }
  };

  const salvarProduto = async (e) => {
    e.preventDefault();
    try {
      const form = new FormData(e.target);
      const data = {
        nome: form.get('nome'),
        descricao: form.get('descricao'),
        preco: parseFloat(form.get('preco')),
        categoria: form.get('categoria'),
        disponivel: form.get('disponivel') === 'true'
      };

      if (produtoEdit && produtoEdit.id) {
        await api.patch(`/produtos/${produtoEdit.id}`, data, token);
      } else {
        await api.post('/produtos', data, token);
      }
      setIsEditModalOpen(false);
      carregarProdutos();
    } catch (e) {
      alert('Erro ao salvar produto');
    }
  };

  const deletarProduto = async (id) => {
    if (confirm('Tem certeza que deseja desativar este produto?')) {
      try {
        await api.delete(`/produtos/${id}`, token);
        carregarProdutos();
      } catch (e) {
        alert('Erro ao desativar produto');
      }
    }
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Lock size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h2>Acesso Restrito</h2>
            <p style={{ color: 'var(--text-muted)' }}>Área administrativa</p>
          </div>
          
          <form onSubmit={handleLogin}>
            {loginErro && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{loginErro}</div>}
            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input className="input" value={usuario} onChange={e => setUsuario(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="input" type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border-color)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
          <h2 style={{ color: 'var(--primary)', margin: 0 }}>Gourmet Admin</h2>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
          <button className={`btn ${tab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', border: 'none' }} onClick={() => setTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className={`btn ${tab === 'pedidos' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', border: 'none' }} onClick={() => setTab('pedidos')}>
            <ShoppingBag size={20} /> Pedidos
          </button>
          <button className={`btn ${tab === 'produtos' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start', border: 'none' }} onClick={() => setTab('produtos')}>
            <Package size={20} /> Produtos
          </button>
        </nav>
        
        <button className="btn" style={{ justifyContent: 'flex-start', color: 'var(--danger)' }} onClick={handleLogout}>
          <LogOut size={20} /> Sair do Sistema
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto' }}>
        
        {tab === 'dashboard' && relatorio && (
          <div className="animate-fade-in">
            <h1 style={{ marginBottom: '2rem' }}>Resumo Financeiro</h1>
            <div className="grid grid-cols-3">
              <div className="card">
                <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Faturamento Total</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.5rem' }}>
                  R$ {relatorio.faturacao_total.toFixed(2)}
                </p>
              </div>
              <div className="card">
                <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Total de Pedidos</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '0.5rem' }}>
                  {relatorio.total_pedidos}
                </p>
              </div>
              <div className="card">
                <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Ticket Médio</h3>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)', marginTop: '0.5rem' }}>
                  R$ {relatorio.ticket_medio}
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'pedidos' && (
          <div className="animate-fade-in">
            <h1 style={{ marginBottom: '2rem' }}>Fila de Pedidos</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pedidos.map(p => (
                <div key={p.id_pedido} className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Pedido #{p.id_pedido}</span>
                      <span className={`badge ${p.status === 'Pendente' ? 'badge-warning' : p.status === 'Entregue' ? 'badge-success' : p.status === 'Cancelado' ? 'badge-danger' : 'badge-primary'}`}>
                        {p.status}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Data: {new Date(p.data_criacao).toLocaleString()} | Total: R$ {p.valor_total.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Itens: {p.itens.map(i => `${i.quantidade}x (ID:${i.produto_id})`).join(', ')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                      className="select" 
                      value={p.status} 
                      onChange={(e) => atualizarStatusPedido(p.id_pedido, e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Preparo">Em Preparo</option>
                      <option value="Em Rota">Em Rota</option>
                      <option value="Entregue">Entregue</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>
              ))}
              {pedidos.length === 0 && <p>Nenhum pedido encontrado.</p>}
            </div>
          </div>
        )}

        {tab === 'produtos' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h1>Gerenciar Cardápio</h1>
              <button className="btn btn-primary" onClick={() => { setProdutoEdit({}); setIsEditModalOpen(true); }}>
                <Plus size={20} /> Novo Produto
              </button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <thead style={{ background: 'var(--surface-hover)' }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Nome</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Categoria</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Preço</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>{p.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{p.nome}</td>
                    <td style={{ padding: '1rem' }}>{p.categoria}</td>
                    <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 'bold' }}>R$ {p.preco.toFixed(2)}</td>
                    <td style={{ padding: '1rem' }}>
                      {p.disponivel ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-danger">Inativo</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button className="btn-icon" style={{ marginRight: '0.5rem', color: 'var(--primary)' }} onClick={() => { setProdutoEdit(p); setIsEditModalOpen(true); }}>
                        <Edit size={16} />
                      </button>
                      <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deletarProduto(p.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* Produto Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{produtoEdit?.id ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={salvarProduto}>
              <div className="modal-body grid">
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input name="nome" className="input" defaultValue={produtoEdit?.nome} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <input name="categoria" className="input" defaultValue={produtoEdit?.categoria} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Descrição</label>
                  <textarea name="descricao" className="textarea" rows="2" defaultValue={produtoEdit?.descricao} required></textarea>
                </div>
                <div className="form-group">
                  <label className="form-label">Preço (R$)</label>
                  <input name="preco" type="number" step="0.01" className="input" defaultValue={produtoEdit?.preco} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Disponível</label>
                  <select name="disponivel" className="select" defaultValue={produtoEdit?.disponivel?.toString() ?? "true"}>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
