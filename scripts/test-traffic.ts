import { getAllRouters } from '@/lib/db/queries/routers';

async function testTraffic() {
  const routers = await getAllRouters();
  console.log('Routers in DB:', routers.length);
  const target = routers[0];
  console.log('Router:', target.name, target.host);

  const authHeader = `Basic ${Buffer.from(`${target.username}:${target.passwordEncrypted}`).toString('base64')}`;
  const res = await fetch(`http://${target.host}:80/rest/interface/monitor-traffic`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interface: 'ether1,LAN',
      once: '',
    }),
  });

  const data = await res.json();
  console.log('Live Traffic Result:', JSON.stringify(data, null, 2));
}

testTraffic().catch(console.error);
