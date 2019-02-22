var library = require(
  "module-library")(require)

library.using([
  "./start-server",
  "child_process"],
  function(start, childProcess) {
    start(9777)
    var isHeadless = process.argv.indexOf("--headless") >= 0
    if (isHeadless) {
      return }
    var url = "http://localhost:9777/minions"
    childProcess.exec(
      "open "+url)})