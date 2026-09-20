async function main() {
  console.log('Sending search request for TOMORROW (20260920 12:00) 청량리 -> 양평 ...');
  const res = await fetch('http://localhost:3840/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      departure: '청량리',
      arrival: '양평',
      dateStr: '20260920',
      timeStr: '12',
      passengers: 1
    })
  });

  const data = await res.json();
  console.log('--- API Response ---');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
