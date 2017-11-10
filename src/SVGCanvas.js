let LinkInteract = require('./LinkInteract.js') // eslint-disable-line no-unused-vars
let NodeInteract = require('./NodeInteract.js') // eslint-disable-line no-unused-vars
let Interaction = require('./Interaction.js') // eslint-disable-line no-unused-vars

class SVGCanvas extends React.Component {
  constructor (props) {
    super(props)
    this.conext = 'canvas'
    this.target = null
    this.targetNode = null

    this.state = { cache: { nodes: {}, links: {} } }
    this.nodes = []

    this.Node = require('./Node.js')
    this.Link = require('./Link.js')
    this.setGraphSize = this.setGraphSize.bind(this)
  }

  setGraphSize () {
    let width = window.innerWidth - 16
    let height = window.innerHeight - 36

    document.documentElement.style.setProperty(`--windowHeight`, `${height}px`)
    document.documentElement.style.setProperty(`--windowWidth`, `${width}px`)

    let svg = document.querySelector('svg')
    svg.setAttribute('width', `${width}px`)
    svg.setAttribute('height', `${height}px`)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    return {width, height}
  }

  // TODO: use d3.mouse instead
  cursorPoint (event) {
    let svg = document.querySelector('svg#Canvas')
    let pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY

    let zoomTransform = document.querySelector('svg#Canvas #zoomTransform')
    pt = pt.matrixTransform(zoomTransform.getCTM().inverse())
    pt = pt.matrixTransform(svg.getScreenCTM().inverse())
    return [pt.x, pt.y]
  }

  measureText (text, style) {
    d3.select('svg#preRender').attr('class', style)
    let renderedText = d3.select('svg#preRender').append('text').text(text).node()

    let size = renderedText.getBBox()
    renderedText.remove()

    return size
  }

  getRandomValue () {
    let a = new Uint32Array(1)
    return window.crypto.getRandomValues(a)
  }

  appendNode (gunPath, position, cache, id) {
    return new Promise((resolve, reject) => {
      let node = new this.Node(id || `node-${this.getRandomValue()}`, this)
      node.data.path = gunPath
      node.gun = this.props.gunData

      node.gun.not((d, k) => {
        this.props.putNewNode(gunPath)
        node.appendSelf()
        node.data.position = position
        resolve()
      })

      node.gun.val((d, k) => {
        let existNode = this.nodes.filter((v) => v.data.path === gunPath)[0]
        if (existNode) {
          console.log('node exists on canvas')
          reject('node exists on canvas')
        }
        if (!existNode) {
          node.appendSelf()
          node.toggleDisplayLevel(2)
          node.data.position = position

          if (cache && Object.keys(cache.detachedValue).length > 0) {
            for (let valueID in cache.detachedValue) {
              node.data.detachedValue[valueID] = cache.detachedValue[valueID]
            }
          }

          if (cache && cache.attachedValue.key) {
            // must add boundingBoxDimension first
            node.data.attachedValue.boundingBoxDimension = cache.attachedValue.boundingBoxDimension
            node.data.attachedValue.key = cache.attachedValue.key
          }

          if (!cache) {
            let availableValueList = Object.keys(d).filter(v => !node.valueFilter.has(v))
            let attachedValueKey = availableValueList[0]

            node.data.attachedValue.key = attachedValueKey
          }
          this.nodes.push(node)
          resolve()
        }
      })
    })
  }

  addInteractions () {
    let canvas = document.querySelector('svg#Canvas')
    let zoom = d3.zoom()
    zoom.on('zoom', function () {
      d3.select(canvas).select('#zoomTransform')
      .attr('transform', d3.event.transform)
    })

    d3.select(canvas).call(zoom)
    .on('dblclick.zoom', null)

    let DropArea = document.querySelector('#DropArea')
    DropArea.addEventListener('dragover', (event) => {
      event.preventDefault()
    })
    DropArea.addEventListener('drop', (event) => {
      this.nodeInteract.hide()

      let nodePath = this.nodeInteract.state.gunPath
      let position = this.cursorPoint(event)
      this.appendNode(nodePath, position)
    })
    DropArea.addEventListener('click', (event) => {
      let NodeInteract = document.querySelector('div#NodeInteract')
      if (NodeInteract.classList.value === 'show') this.nodeInteract.hide()
    })
  }

  set context (value) {
    console.log('set context: ', value)
    if (value === 'canvas') this.applyCanvasContext()
    if (value === 'link') this.applyLinkContext()
    if (value === 'node') this.applyNodeContext()
    if (value === 'value') this.applyValueContext()
    if (value === 'attachedValue') this.applyAttachedValueContext()
    return value
  }

  setContext (selection, context) {
    selection.on('mouseenter', (d) => {
      this.target = d
      this.context = context
      if (context === 'value' || context === 'attachedValue') {
        this.valueDOM = selection.node().parentNode
        this.valuePath = this.valueDOM.querySelector('.valueLabel').innerHTML
      }
    })

    selection.on('mouseleave', () => {
      this.target = null
      this.context = 'canvas'
    })
  }

  applyCanvasContext (selection) {
    let commands = (event) => {
      if (event.key === 'n') this.nodeInteract.show()
      if (event.key === 's') this.saveCache()
      if (event.key === 'l') this.loadCache()
    }

    window.onkeyup = commands
  }

  applyNodeContext (selection) {
    let commands = (event) => {
      if (event.key === 'p') this.target.gun.val((data, key) => { console.log(data, key) })
      if (event.key === 's') this.target.toggleDisplayLevel()
      if (event.key === 'n') this.interaction.nodeName(this.target)
      if (event.key === 'v') this.interaction.nodeValue(this.target)
      if (event.key === 'Backspace') this.props.removeNode(this.target, event.shiftKey)
    }

    window.onkeyup = commands
  }

  applyValueContext (selection) {
    let commands = (event) => {
      if (event.key === 'Backspace') {
        let valueID = this.valueDOM.id
        let link = this.target.links.detachedValue.filter((l) => l.toValue === valueID)[0]
        this.valueDOM.remove()
        link.DOM.remove()
        if (event.shiftKey) this.target.gun.path(this.valuePath).put(null)
      }
    }

    window.onkeyup = commands
  }

  applyAttachedValueContext (selection) {
    let commands = (event) => {
      // if (event.key === 'ArrowRight')
      // if (event.key === 'ArrowLeft')
    }

    window.onkeyup = commands
  }

  applyLinkContext (selection) {
    let commands = (event) => {
      if (event.key === 'c') this.target.edit()
      if (event.key === 'n') this.linkInteract.show(this.target)
      if (event.key === 'Backspace') this.props.removeLink(this.target, event.shiftKey)
    }

    window.onkeyup = commands
  }

  componentDidMount () {
    this.setGraphSize()
    window.onresize = this.setGraphSize

    this.addInteractions()
    this.context = 'canvas'
  }

  saveCache () {
    console.log(JSON.stringify(this.state.cache, null, 2))
  }

  loadCache () {
    let cache = {
      'nodes': {
        'node-3805295699': {
          'attachedValue': {
            'boundingBoxDimension': [
              125,
              23
            ],
            'key': 'another value'
          },
          'detachedValue': {
            'value-2116150067': {
              'key': 'value',
              'boundingBoxDimension': [
                124,
                33
              ],
              'position': [
                502,
                395
              ]
            }
          },
          'path': 'a',
          'displayLevel': 2,
          'position': [
            580,
            311
          ]
        },
        'node-99756589': {
          'attachedValue': {
            'key': 'value',
            'boundingBoxDimension': [
              117.640625,
              25
            ]
          },
          'detachedValue': {},
          'path': 'b',
          'displayLevel': 2,
          'position': [
            898,
            421
          ]
        }
      },
      'links': {
        'link-1225459392': {
          'from': [
            580,
            311
          ],
          'to': [
            898,
            421
          ],
          'controlFrom': [
            641,
            269
          ],
          'controlTo': [
            858,
            295
          ],
          'fromNode': 'node-3805295699',
          'toNode': 'node-99756589'
        }
      }
    }

    let appends = []
    for (let id in cache.nodes) {
      let nodeCache = cache.nodes[id]
      let position = nodeCache.position
      let path = nodeCache.path

      this.props.getGunData(path)
      appends.push(this.appendNode(path, position, nodeCache, id))
    }

    Promise.all([appends]).then(() => {
      for (let id in cache.links) {
        let linkID = `link-${this.getRandomValue()}`
        let link = new this.Link(linkID, this)
        link.data.cache = true
        link.data.id = linkID
        let cacheData = cache.links[id]
        Object.assign(link.data, {from: cacheData.from, controlFrom: cacheData.controlFrom, to: cacheData.to, controlTo: cacheData.controlTo})
        link.appendSelf()
        .call((s) => this.setContext(s, 'link'))

        let fromNode = this.nodes.find((v) => v.data.id === cacheData.fromNode)
        let toNode = this.nodes.find((v) => v.data.id === cacheData.toNode)
        fromNode.links.from[toNode.data.id] = link
        toNode.links.to[fromNode.data.id] = link
      }
    })
  }

  render () {
    console.log('state:', this.state)
    return (
      <div>
        <div id="DropArea">
          <svg id='Canvas'><g id="zoomTransform"></g></svg>
        </div>
        <div id="Status"></div>
        <svg id='preRender'></svg>
        <NodeInteract ref={(c) => { this.nodeInteract = c }} getGunData={this.props.getGunData} />
        <LinkInteract ref={(c) => { this.linkInteract = c }} />
        <Interaction ref={(c) => { this.interaction = c }} />
      </div>
    )
  }
}

module.exports = SVGCanvas
