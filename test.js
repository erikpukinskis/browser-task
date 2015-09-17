var library = require("nrtv-library")(require)

library.test(
  "starts",
  ["./minions", "nrtv-server"],
  function(expect, done, MinionQueue, server) {

    var queue = new MinionQueue()

    server.start(8888)

    queue.addTask("blah",
      function(minion, iframe) {
        minion.browse("/blah")
        minion.report(iframe.contentDocument.querySelector("body").innerHTML)
      }
    )

    // And here's our test server the minion is going to hit:

    server.get("/blah",
      function(x, response) {
        response.send("booga")
      }
    )

    done()
    server.stop()
  }
)