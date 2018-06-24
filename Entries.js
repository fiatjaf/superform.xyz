const React = require('react')
const h = require('react-hyperscript')
const friendlyTime = require('friendly-time')
const JSONEditor = require('react-json-editor-viewer').JSONEditor

module.exports = class extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      editing: null,
      editingData: null
    }
  }

  render () {
    if (this.state.editing) {
      return (
        h('#Entries', [
          h('h2', [
            'Editing entry ',
            h('em', this.state.editing),
            ': '
          ]),
          h(JSONEditor, {
            data: this.state.editingData,
            collapsible: true,
            onChange: (key, value, parent, data) => {
              this.setState({editingData: data.root})
            }
          }),
          h('.controls', [
            h('button.delete', {
              onClick: e => {
                e.preventDefault()
                this.props.deleteEntry(this.state.editing)
                this.setState({editing: null, editingData: null})
              }
            }, 'Delete entry'),
            h('button', {
              onClick: e => {
                e.preventDefault()
                this.setState({editing: null, editingData: null})
              }
            }, 'Cancel edits'),
            h('button.save', {
              onClick: e => {
                e.preventDefault()
                this.props.editEntry(this.state.editing, this.state.editingData)
                this.setState({editing: null, editingData: null})
              }
            }, 'Save edits')
          ])
        ])
      )
    }

    return (
      h('#Entries', [
        h('h1', 'Entries'),
        h('table', [
          h('tbody', this.props.entries.reverse().map(entry =>
            h('tr', {
              onClick: () => {
                this.setState({editing: entry.id, editingData: entry.data})
              }
            }, [
              h('td', friendlyTime(entry.created_at)),
              h('td', [ h('.entry', JSON.stringify(entry.data)) ])
            ])
          ))
        ])
      ])
    )
  }
}
