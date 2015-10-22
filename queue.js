var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-minion-queue",
  function() {
    function MinionQueue() {
      this.tasks = []
      this.workers = []
      this.working = false
    }

    MinionQueue.prototype.addTask =
      function(func, callback) {
        this.tasks.push({
          func: func,
          callback: callback
        })
        this.work()
      }

    function callable(func) {
      if (typeof func == "string") {
        return eval("f="+func)
      } else if (typeof func == "function") {
        return func
      } else {
        throw new Error(func+" can't be turned into a function")
      }
    }

    MinionQueue.prototype.requestWork =
      function(callback, format) {
        this.workers.push(callback)
        this.work()
        var workers = this.workers

        return {
          quit: function() {
            var i = workers.indexOf(callback)
            workers.splice(i, 1)
            callback.__nrtvMinionQuit = true
          }
        }
      }

    MinionQueue.prototype.work =
      function() {
        if (this.working) { return }
        this.working = true
        this._work()
      }

    MinionQueue.prototype._work =
      function() {
        var noTasks = this.tasks.length < 1
        var noWorkers = this.workers.length < 1

        if (noTasks || noWorkers) {
          this.working = false
          return
        }

        this.working = true
        var _this = this

        var worker = this.workers.shift()
        var task = this.tasks.shift()
        var func = task.func
        var callback = task.callback

        worker(func, function(message) {
          callback(message)

          if (!worker.__nrtvMinionQuit) {
            _this.workers.push(worker)
          }

          _this._work()
        })

        this._work()
      }

    return MinionQueue
  }
)