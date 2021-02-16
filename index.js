const robots = {
    input: require('./robots/user-input.js'),
    text: require('./robots/text.js')
}

async function start() {
    robots.input()
    await robots.text()

    const content = robots.state.load()
    console.dir(content, { depht: null })
}

start()