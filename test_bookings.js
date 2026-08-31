const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(process.cwd(), 'database.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

function enrich(bookingsList) {
  return bookingsList.map(b => {
    const client = db.clientes.find(c => c.id === b.cliente_id);
    const service = db.servicos.find(s => s.id === b.servico_id);
    return {
      ...b,
      cliente: client ? { id: client.id, nome: client.nome, telefone: client.telefone, cpf: client.cpf } : null,
      servico: service ? { id: service.id, nome: service.nome, preco: service.preco, duracao_estimada_minutos: service.duracao_estimada_minutos } : null
    };
  }).sort((a,b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio));
}

function getBookingsForProfessional(salaoId) {
  const bookings = db.agendamentos.filter(b => b.salao_id === salaoId);
  return enrich(bookings);
}

function getBookingsForClient(salaoId, clientId) {
  const bookings = db.agendamentos.filter(b => b.salao_id === salaoId && b.cliente_id === clientId);
  return enrich(bookings);
}

// Pick a salon and a client from seed data
const salon = db.saloes[0];
const salonId = salon.id;
const client = db.clientes.find(c => c.salao_id === salonId);

console.log('Salon:', salonId);
console.log('Sample client:', client ? client.id : 'none');

console.log('\n[PROFESSIONAL] should see all bookings for the salon:');
const prof = getBookingsForProfessional(salonId);
console.log('Total bookings for salon:', prof.length);
console.log('Sample first booking:', prof[0] ? { id: prof[0].id, cliente_id: prof[0].cliente_id } : null);

console.log('\n[CLIENT] should see only their bookings:');
if (client) {
  const clientBookings = getBookingsForClient(salonId, client.id);
  console.log('Client id:', client.id, 'bookings count:', clientBookings.length);
  clientBookings.forEach(b => console.log('-', b.id, b.cliente_id, b.data_hora_inicio));
} else {
  console.log('No client found for salon to test.');
}
