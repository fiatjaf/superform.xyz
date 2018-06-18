const React = window.React = require('react')
const h = window.h = require('react-hyperscript')

window.ReactDOM = require('react-dom')

module.exports = class extends React.Component {
  render () {
    return (
      h('div', {
        ref: el => {
          if (!el) return

          var module = {exports: {}}

          try {
            eval(this.props.code)
          } catch (e) {}

          var state = {}
          for (let i = 0; i < this.props.entries.length; i++) {
            try {
              (module.reduce || module.exports.reduce)(state, this.props.entries[i])
            } catch (e) {}
          }

          const submit = (entry) => {
            this.props.addEntry(entry)
          }

          try {
            (module.view || module.exports.view)(el, state, submit)
          } catch (e) {}
        }
      })
    )
  }
}
