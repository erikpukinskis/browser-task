var library = require("nrtv-library")(require)

module.exports = library.export(
  "minions",
  ["./dispatcher", "./api-client"],
  function(dispatcher, api) {
    return {
      dispatcher: dispatcher,
      api: api
    }
  }
)




