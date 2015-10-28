var test = require("nrtv-test")(require)

test.using(
  "adding tasks while multiple minions do work",
  ["../dispatcher"],
  function(expect, done, Dispatcher) {

    var queue = new Dispatcher()

    var results = []

    queue.addTask(function(callback) {
      callback("one")
    }, function ok(message) {
      results[1] = message
    })

    var dougie = queue.requestWork(
      function doug(task) {
        task.func(function(message) {
          task.callback(message+" (via Doug)")
        })
      }
    )

    expect(results[1]).to.equal("one (via Doug)")
    done.ish("Doug got the first job")

    var barb = queue.requestWork(
      function barbara(task) {
        task.func(function(message) {
          task.callback(message+" (via Barbara)")
        })
      }
    )

    queue.addTask(function(callback) {
      callback("two")
    }, function two(message) {
      results[2] = message
    })

    expect(results[2]).to.equal("two (via Doug)")
    done.ish("Doug got the next job too, since he finished his work before Barbara joined")

    var j = queue.requestWork(
      function janet(task) {
        task.func(function(message) {
          task.callback(message+" (via Janet)")
        })
      }
    )

    queue.addTask(function(callback) {
      callback("three")
    }, function three(message) {
      results[3] = message
    })

    expect(results[3]).to.equal("three (via Barbara)")
    done.ish("Barb got the third one")

    dougie.quit()

    queue.addTask(function(callback) {
      callback("four")
    }, function four(message) {
      results[4] = message
    })

    expect(results[4]).to.equal("four (via Janet)")
    done.ish("Dougie got skipped cuz he quit")

    barb.quit()
    j.quit()

    queue.addTask(function(callback) {
      callback("five")
    }, function five(message) {
      results[5] = message
    })

    expect(results[5]).to.be.undefined

    done.ish("world doesn't explode if the worker queue dries up")

    done()
  }
)

test.using(
  "pass args on",
  ["../dispatcher"],
  function(expect, done, queue) {

    queue.addTask(
      function takeCredit(callback, who) {
        callback(who+" did this.")
      },
      ["Brett"],
      function(message) {
        expect(message).to.equal(
          "Brett did this.")
        done()
      }
    )

    queue.requestWork(
      function worker(task) {
        if (task.args[0] != "Brett") {
          throw new Error("Who are you and what have you done with Brett!")
        }

        task.func.apply(null, [task.callback].concat(task.args))
      }
    )
  }
)
