class Primitives {
  group (className, idName) {
    let group = document.createElementNS(d3.namespaces.svg, 'g')
    if (className) d3.select(group).attr('class', className)
    if (idName) d3.select(group).attr('id', idName)

    return group
  }

  circle (styleSelector) {
    // TODO: need this, why not css
    let style = {
      'nodeValueAnchor': {
        'r': '5',
        'stroke': 'black',
        'stroke-width': '0.5',
        'fill': 'white'
      },
      'nodeAnchor': {
        'r': '25',
        'stroke': 'white',
        'fill': 'whiteSmoke',
        'stroke-width': '10px'
      },
      'valueAnchorBackground': {
        'stroke': 'white',
        'fill': 'white'
      },
      'nodeOrbit': {
        'stroke': 'rgba(255,255,255,0)',
        'fill': 'none',
        'r': '220'
      }
    }

    let circle = document.createElementNS(d3.namespaces.svg, 'circle')
    d3.select(circle)
    .attr('class', styleSelector)
    .attr('r', '10')
    .attr('stroke', 'black')
    .attr('stroke-width', 0.5)

    for (let attr in style[styleSelector]) {
      d3.select(circle).attr(attr, style[styleSelector][attr])
    }

    return circle
  }

  text (className, idName) {
    let text = document.createElementNS(d3.namespaces.svg, 'text')
    if (className) d3.select(text).attr('class', className)
    if (idName) d3.select(text).attr('id', idName)

    return text
  }

  getRandomValue () {
    let a = new Uint32Array(1)
    return window.crypto.getRandomValues(a)
  }

  measureText (text, style) {
    d3.select('svg#preRender').attr('class', style)
    let renderedText = d3.select('svg#preRender').append('text').text(text).node()

    let size = renderedText.getBBox()
    renderedText.remove()

    return size
  }
}

module.exports = Primitives
