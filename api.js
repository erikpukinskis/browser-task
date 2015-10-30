var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-api-client",
  ["request", "nrtv-dispatcher"],
  function(request, Dispatcher) {

    function addTask() {
      var task = Dispatcher.buildTask(arguments)
      _addTask(task)
    }

    function _addTask(task, prefix) {
      var data = {
        funcSource: task.func.toString()
      }
      if (task.args) {
        data.args = task.args
      }

      var url = "http://localhost:9777"+(prefix||"")+"/tasks"

      post({
        path: "/tasks",
        prefix: prefix,
        data: data
      }, function(body) {
        task.callback(body)
      })
    }

    function post(options, callback) {
      url = "http://localhost:9777"+(options.prefix||"")+options.path

      request.post({
        url: url,
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body: options.data
      }, function(error, response) {
        if (error) { throw error }
        callback(response.body)
      })
    }

    function installHandlers(server, queue) {

      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.callback = function(message) {
            response.send(message)
          }
          queue.addTask(task)
        }
      )
    }

    return {
      addTask: addTask,
      installHandlers: installHandlers
    }
  }
)