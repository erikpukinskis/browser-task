var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-api-client",
  ["nrtv-make-request", "nrtv-dispatcher", "http", "guarantor"],
  function(makeRequest, Dispatcher, http, guarantor) {


    // SERVER

    function installHandlers(server, dispatcher) {

      server.addRoute(
        "post",
        "/tasks",
        function(request, response) {
          var task = request.body
          task.callback = function(message) {
            response.send(message)
          }
          dispatcher.addTask(task)
        }
      )

      var retainedMinions = {}

      server.addRoute(
        "post",
        "/retainers",
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

      server.addRoute(
        "delete",
        "/retainers/:id",
        function(request, response) {
          var id = request.params.id
          var minion = retainedMinions[id]
          if (!minion) {
            console.log("Tried to resign", id, "but it is long gone.")
            return
          }
          minion.resign()
          delete retainedMinions[id]
          response.send("ok!")
        }
      )

      server.addRoute(
        "post",
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

      // This is a bad smell, trying to match the format of dispatcher. I think all of this API is actually just dispatcher api, and can go there? Minions is really about the frame and the server.... although even some of that seems more suited to nrtv-browse.

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

    function buildUrl(path) {
      return (api.host || "http://localhost:9777") + path
    }

    function post(options, callback) {

      var url = buildUrl(options.prefix||"")+options.path

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


    var unresignedMinions = {}
    guarantor(resignMinions)

    function resignMinions(callback) {
      var ids = Object.keys(unresignedMinions)

      if (ids.length) {
        console.log("\nWe have", ids.length, "minion(s) still to clean up. Working on it... hit ctrl+c to give up")
      }

      function resignMore() {
        var id = ids.pop()

        if (!id) {
          return callback()
        }
        var item = items[id]
        cleaner(item, id, resignMore)
      }

      resignMore()
    }

    function ApiRetainer(id) {
      this.id = id
      unresignedMinions[id] = this
    }

    ApiRetainer.prototype.addTask =
      function() {
        var task = Dispatcher.buildTask(arguments)
        var prefix = "/retainers/"+this.id
        _addTask(task, prefix)
      }

    ApiRetainer.prototype.resign =
      function(callback) {
        var id = this.id
        var url = buildUrl("/retainers/"+id)
        makeRequest({
          method: "DELETE",
          url: url
        }, function(x, response, error) {
          if (error) { throw error }
          if (response.statusCode != 200) {
            throw new Error(response.body)
          }
          delete unresignedMinions[id]
          callback && callback()
        })
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