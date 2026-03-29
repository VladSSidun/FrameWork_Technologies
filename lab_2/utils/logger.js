// Варіант 1 — кожен лог є валідним JSON рядком
function log(level, fields) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...fields,
  };
  if (level === 'ERROR') {
    process.stderr.write(JSON.stringify(entry) + '\n');
  } else {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

function logRequest(method, url, status) {
  let level = 'INFO';
  if (status >= 500) level = 'ERROR';
  else if (status >= 400) level = 'WARN';
  log(level, { method, url, status });
}

module.exports = { log, logRequest };
