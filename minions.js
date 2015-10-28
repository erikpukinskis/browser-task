var library = require("nrtv-library")(require)

module.exports = library.export(
  "minions",
  ["./dispatcher", "./server", "./api-client"],
  function(dispatcher, server, api) {
    return {
      dispatcher: dispatcher,
      api: api,
      server: server
    }
  }
)




