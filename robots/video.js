
const gm = require('gm').subClass({ imageMagick: true })
const hbjs = require("handbrake-js")
const fs = require("fs")
const state = require('./state.js')
const spawn = require('child_process').spawn
const os = require('os')
const path = require('path')

const rootPath = path.resolve(__dirname, '..')

const fromRoot = relPath => path.resolve(rootPath, relPath)

async function robot() {
    const content = state.load()

    //await convertAllImage(content)
    //await createAllSentencesImages(content)
    //await createYoutubeThumbnail()
    //await createAfterEffectsScript(content)
    await renderVideoWithAfterEffects()

    state.save(content)

    async function convertAllImage(sentenceIndex) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await convertImage(sentenceIndex)
        }
    }

    async function convertImage(sentenceIndex) {
        return new Promise((resolve, reject) => {
            const inputFile = fromRoot(`./content/${sentenceIndex}-original.png[0]`)
            const outputFile = fromRoot(`./content/${sentenceIndex}-converted.png`)
            const width = 1920
            const height = 1080

            gm()
                .in(inputFile)
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-blur', '0x9')
                .out('-resize', `${width}x${height}^`)
                .out(')')
                .out('(')
                .out('-clone')
                .out('0')
                .out('-background', 'white')
                .out('-resize', `${width}x${height}`)
                .out(')')
                .out('-delete', '0')
                .out('-gravity', 'center')
                .out('-compose', 'over')
                .out('-composite')
                .out('-extent', `${width}x${height}`)
                .write(outputFile, (error) => {
                    if (error) {
                        return reject(error)
                    }

                    console.log(`> Image converted: ${outputFile}`)
                    resolve()
                })
        })
    }

    async function createAllSentencesImages(content) {
        for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++) {
            await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
        }
    }

    async function createSentenceImage(sentenceIndex, sentenceText) {
        return new Promise((resolve, reject) => {
            const outputFile = fromRoot(`./content/${sentenceIndex}-sentence.png`)

            const templateSettings = {
                0: {
                    size: '1920x400',
                    gravity: 'center'
                },
                1: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                2: {
                    size: '800x1080',
                    gravity: 'west'
                },
                3: {
                    size: '1920x400',
                    gravity: 'center'
                },
                4: {
                    size: '1920x1080',
                    gravity: 'center'
                },
                5: {
                    size: '800x1080',
                    gravity: 'west'
                },
                6: {
                    size: '1920x400',
                    gravity: 'center'
                }

            }

            gm()
                .out('-size', templateSettings[sentenceIndex].size)
                .out('-gravity', templateSettings[sentenceIndex].gravity)
                .out('-background', 'transparent')
                .out('-fill', 'white')
                .out('-kerning', '-1')
                .out(`caption:${sentenceText}`)
                .write(outputFile, (error) => {
                    if (error) {
                        return reject(error)
                    }

                    console.log(`> [video-robot] Sentence created: ${outputFile}`)
                    resolve()
                })
        })
    }

    async function createYoutubeThumbnail() {
        return new Promise((resolve, reject) => {
            gm()
                .in(fromRoot('./content/0-converted.png'))
                .write(fromRoot('./content/youtube-thumbnail.jpg'), (error) => {
                    if (error) {
                        return reject(error)
                    }

                    console.log('> [video-robot] YouTube thumbnail created')
                    resolve()
                })
        })
    }

    async function createAfterEffectsScript(content) {
        await state.saveScript(content)
    }

    async function renderVideoWithAfterEffects() {
        return new Promise((resolve, reject) => {
            const systemPlatform = os.platform
            let aerenderFilePath
            if (systemPlatform == 'darwin') {
                aerenderFilePath = '/mnt/c/Program Files/Adobe/Adobe After Effects 2020/Support Files/aerender.exe'
            } else if (systemPlatform == 'win32') {
                aerenderFilePath = 'C:\\Program Files\\Adobe\\Adobe After Effects 2020\\Support Files\\aerender.exe'
            } else {
                return reject(new Error('System not Supported'))
            }

            const templateFilePath = fromRoot('./templates/1/template.aep')
            const destinationFilePath = fromRoot('./content/output.mov')
            const destinationFilePathConverted = fromRoot('./content/output.mp4')

            console.log('> [video-robot] Starting After Effects')

            const aerender = spawn(aerenderFilePath, [
                '-comp', 'main',
                '-project', templateFilePath,
                '-output', destinationFilePath
            ])

            aerender.stdout.on('data', (data) => {
                process.stdout.write(data)
            })

            aerender.on('close', () => {
                console.log('> [video-robot] After Effects closed')
                console.log("> [video-robot] Convert to .mp4")
                hbjs
                    .spawn({
                        input: destinationFilePath,
                        output: destinationFilePathConverted
                    })
                    .on("error", err => {
                        // invalid user input, no video found etc
                        console.error(`> [video-robot] Error found while trying to convert video: ${err}`)
                    })
                    .on("complete", progress => {
                        console.log("> [video-robot] Encoding finished successfully");
                        //remove big MOV file
                        fs.unlinkSync(destinationFilePath, err => {
                            if (err) {
                                console.error(`> [video-robot] Error removing .mov file: ${err}`)
                            }
                            console.log(`> [video-robot] output.MOV removed.`)
                        })
                        resolve()
                    })
            })
        })
    }
}

module.exports = robot