var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-api-client",
  ["request", "./dispatcher"],
  function(request, Dispatcher) {

    function addTask() {
      var task = Dispatcher.buildTask(arguments)

      var data = {
        funcSource: task.func.toString()
      }
      if (task.args) {
        data.args = args
      }
      var body = JSON.stringify(data)

      request.post({
        url: "http://localhost:9777/tasks",
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body: data
      }, function(error, response) {
        if (error) { throw error }
        task.callback(response.body)
      })
    }

    return {
      addTask: addTask
    }
  }
)