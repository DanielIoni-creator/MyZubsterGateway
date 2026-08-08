/**
 * Plugin host per i robot - Bounty BOT-7 (#344)
 *
 * Ogni robot generato dallo scaffolding espone un piccolo sistema di hook, così
 * si possono aggiungere comportamenti (logging, metriche, notifiche extra,
 * validazioni) senza modificare il codice del robot.
 *
 *   const robot = require('./robot_translation');
 *   robot.use({
 *     name: 'metrics',
 *     hooks: {
 *       'job:delivered': ({ jobId }) => console.log('consegnato', jobId)
 *     }
 *   });
 *
 * Gli hook non possono rompere il robot: un plugin che lancia viene loggato e
 * ignorato. Un plugin difettoso deve degradare l'osservabilità, non il lavoro.
 */

const HOOKS = ['job:created', 'job:executing', 'job:delivered', 'job:failed'];

function createPluginHost(robotName) {
  const plugins = [];

  /**
   * @param {{name: string, hooks: Object<string, Function>}} plugin
   */
  function use(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Un plugin deve essere un oggetto { name, hooks }');
    }
    if (!plugin.name) throw new Error('Un plugin deve avere un name');
    if (!plugin.hooks || typeof plugin.hooks !== 'object') {
      throw new Error(`Il plugin ${plugin.name} deve esporre un oggetto hooks`);
    }

    const unknown = Object.keys(plugin.hooks).filter(h => !HOOKS.includes(h));
    if (unknown.length) {
      // Un hook scritto male sarebbe silenziosamente inerte: meglio fallire subito.
      throw new Error(
        `Il plugin ${plugin.name} registra hook sconosciuti: ${unknown.join(', ')}. ` +
        `Disponibili: ${HOOKS.join(', ')}`
      );
    }

    plugins.push(plugin);
    return host;
  }

  /** Esegue in sequenza gli hook registrati. Non lancia mai. */
  async function emit(hook, context = {}) {
    for (const plugin of plugins) {
      const fn = plugin.hooks[hook];
      if (typeof fn !== 'function') continue;
      try {
        await fn({ robot: robotName, hook, ...context });
      } catch (err) {
        console.error(`[${robotName}] plugin "${plugin.name}" ha fallito su ${hook}: ${err.message}`);
      }
    }
  }

  function list() {
    return plugins.map(p => ({ name: p.name, hooks: Object.keys(p.hooks) }));
  }

  function clear() {
    plugins.length = 0;
  }

  const host = { use, emit, list, clear, HOOKS };
  return host;
}

module.exports = { createPluginHost, HOOKS };
