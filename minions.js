var library = require("nrtv-library")(require)

module.exports = library.export(
  "minions",
  ["./dispatcher", "./server", "./api"],
  function(dispatcher, server, api) {

    var minions = {
      dispatcher: dispatcher,
      api: api,
      server: server,
      halp: halp
    }

    function halp(done) {
      var port = minions.server.getPort()
      done.failAfter(10000)
      console.log("---\nExcuse me, human!\n\nYou have 10 seconds to open http://localhost:"+port+"/minions in a web\nbrowser so the tests can finish! Go!\n\nLove,\nComputer\n---")  
    }

    return minions
  }
)




