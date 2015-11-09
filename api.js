var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-api-client",
  ["nrtv-make-request", "nrtv-dispatcher", "http"],
  function(makeRequest, Dispatcher, http) {


    // SERVER

    function installHandlers(server, dispatcher) {

      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.callback = function(message) {
            response.send(message)
          }
          dispatcher.addTask(task)
        }
      )

      var retainedMinions = {}

      server.post("/retainers",
        function(request, response) {

          var retainer = dispatcher.retainWorker()

          do {
            var id = Math.random().toString(36).split(".")[1].substr(0,5)
          } while(retainedMinions[id])

          retainedMinions[id] = retainer

          response.send({
            id: id
          })
        }
      )

      server.post(
        "/retainers/:id/tasks",
        function(request, response) {
          var id = request.params.id

          try {
            retainedMinions[id].addTask(
              request.body,
              function(message) {
                response.send(message)
              }
            )
          } catch(e) {
            response.status(500).send(e.message)
          }
        }
      )

    }


    // CLIENT

    function addTask() {
      var task = Dispatcher.buildTask(arguments)
      _addTask(task)
    }

    function _addTask(task, prefix) {
      var source = task.func.toString()

      var data = {
        isNrtvDispatcherTask: true,
        funcSource: source,
        options: task.options,
        args: task.args
      }

      var path = (prefix||"")+"/tasks"

      post({
        path: path,
        data: data
      }, function(body) {
        task.callback(body)
      })
    }

    function post(options, callback) {

      var host = api.host || "http://localhost:9777"

      var url = host+(options.prefix||"")+options.path

      var params = {
        method: "POST",
        url: url,
        data: options.data
      }

      makeRequest(
        params, 
        function(content, response, error) {

          function fail(error) {
            console.log(" ⚡ BAD REQUEST ⚡ ", error, params)

            process.exit()
          }

          if (error) {
            fail(error)
          } else if (response.statusCode > 399) {
            fail(content)
          } else {
            callback(content)
          }
        }
      )

    }




    function retainMinion(callback) {
      post({
        path: "/retainers",
      },
      function(response) {
        callback(
          new ApiRetainer(response.id)
        )
      })
    }

    function ApiRetainer(id) {
      this.id = id
    }

    ApiRetainer.prototype.addTask =
      function() {
        var task = Dispatcher.buildTask(arguments)
        var prefix = "/retainers/"+this.id
        _addTask(task, prefix)
      }

    ApiRetainer.prototype.resign =
      function() {
      }
    

    var api = {
      addTask: addTask,
      retainMinion: retainMinion,
      installHandlers: installHandlers,
      at: function(url) {
        if (this.host) {
          throw new Error("Already set api host to "+this.host)
        }
        this.host = url
        return this
      }
    }

    return api
  }
)