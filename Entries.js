const React = require('react')
const h = require('react-hyperscript')

module.exports = class extends React.Component {
  render () {
    return (
      h('#Entries', [
        h('h1', 'Entries'),
        h('div', this.props.entries.map(entry =>
          h('.entry', JSON.stringify(entry))
        ))
      ])
    )
  }
}
