require("module-library")(require).using(["./start-server", "child_process"], function(start, childProcess) {
  start(9777)
  childProcess.exec("open http://localhost:9777/minions")
})