async function txhandler(exec, ...args) {
  try {
    await exec.apply(null, args);
  } catch(e) {
    throw(`An error occurred, ${e.code} - ${e.reason}`);
  }
}

module.exports = { txhandler }