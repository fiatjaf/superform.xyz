const humane = require('humane-js')
const throttle = require('throttleit')

humane.waitForMove = false
humane.timeout = 4000

const notify = throttle((content, opt) => {
  humane.log(content, opt)
}, 2000)

module.exports.n_error = str => notify(str, {
  addnCls: 'humane-flatty-error'
})

module.exports.n_success = str => notify(str, {
  addnCls: 'humane-flatty-success'
})
