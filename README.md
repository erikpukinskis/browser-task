Do stuff in other peoples' browsers.

Here's a simple example.

library.using(
  ["nrtv-minion", draw-something", "message", "nrtv-server"],
  function(minion, draw, message, Server) {
    minion.message("Draw something!")
    minion.draw()
  }
)


// review every command, at least the first few for each user

// flag things with adjectives

// User 2354: [auto-declined message with prurient content]


# Why

 - you always get to a point when you want to pause the test and look in the browser anyway

 - it works on any browser you want, so you can use it for testing too
 
 - I will need it for screencasting tests, customer support, etc anyway

 - iframe stuff doesn't work in zombiejs. In general there are holes in the zombie/jsdom coverage

 - jsdom uses ES6. Also it is a nightmare.

 - zombie uses ws which uses bufferutils which compiles stuff and slows down npm installs dramatically
 