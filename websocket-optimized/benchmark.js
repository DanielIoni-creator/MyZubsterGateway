const WebSocket = require('ws');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

// Test di connessione
suite.add('WebSocket Connection', {
  defer: true,
  fn: function(deferred) {
    const ws = new WebSocket('ws://localhost:8080');
    ws.on('open', () => {
      ws.close();
      deferred.resolve();
    });
  }
});

// Test di messaggio
suite.add('WebSocket Message (1KB)', {
  defer: true,
  fn: function(deferred) {
    const ws = new WebSocket('ws://localhost:8080');
    const message = 'x'.repeat(1024);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ topic: 'test', data: message }));
      setTimeout(() => {
        ws.close();
        deferred.resolve();
      }, 100);
    });
  }
});

// Test di messaggio batch
suite.add('WebSocket Batch (100 messaggi)', {
  defer: true,
  fn: function(deferred) {
    const ws = new WebSocket('ws://localhost:8080');
    const messages = 100;
    let sent = 0;
    
    ws.on('open', () => {
      const interval = setInterval(() => {
        if (sent >= messages) {
          clearInterval(interval);
          setTimeout(() => {
            ws.close();
            deferred.resolve();
          }, 500);
          return;
        }
        ws.send(JSON.stringify({ 
          topic: 'test', 
          data: { id: sent, timestamp: Date.now() } 
        }));
        sent++;
      }, 10);
    });
  }
});

suite.on('cycle', (event) => {
  console.log(String(event.target));
});

suite.on('complete', function() {
  console.log('\n✅ Benchmark completato!');
  console.log('Fastest is ' + this.filter('fastest').map('name'));
});

console.log('🚀 Avvio benchmark WebSocket...\n');
suite.run({ async: true });
