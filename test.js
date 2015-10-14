var test = require("nrtv-test")(require)

test.library.define(
  "button-server",
  ["nrtv-element", "nrtv-browser-bridge", "nrtv-element-server"],
  function(element, bridge, server) {

    var ahey = bridge.defineFunction(
      function() {
        document.querySelector("body").innerHTML = "a hey ahoy!"
      }
    )
    var butt = element(
      "button.hai",
      {onclick: ahey.evalable()},
      "O hai"
    )

    server.serve(butt)

    return server
  }
)

test.using(
  "starts",
  ["./minions", "button-server"],
  function(expect, done, MinionQueue, buttonServer) {

    var queue = new MinionQueue()

    buttonServer.start(8888)

    queue.addTask("blah",
      function doSomeFunStuff(minion, iframe) {
        minion.browse("/", function() {
          minion.press(".hai")
          minion.report(iframe.contentDocument.querySelector("body").innerHTML)          
        })
      }
    )

    return done()
    done()
    buttonServer.stop()
  }
)