const fs = require("fs")
const path = require("path")
const { promisify } = require("util")

const cheerio = require("cheerio")
const http = require("axios")

const writeFile = promisify(fs.writeFile)

const NOAA_URL =
  "https://www.star.nesdis.noaa.gov/GOES/sector_band.php?sat=G16&sector=taw&band=13&length=96"

const downloadedImages = []

function fetchImageUrls() {
  console.log("fetching...")
  return http.get(NOAA_URL).then(response => {
    const $ = cheerio.load(response.data)
    const $images = $('img[src^="https://cdn.star.nesdis.noaa.gov/"]')
    const images = $images.map((i, $img) => {
      const { src, title } = $img.attribs
      return { src, title }
    })
    return images.toArray()
  })
}

function downloadNewImage({ src, title }) {
  console.log("downloading new image...")
  const outputPath = path.join(__dirname, "images", `${title}.jpg`)
  return http.get(src, { responseType: "arraybuffer" }).then(response => {
    const b = new Buffer(response.data, "binary")
    return writeFile(outputPath, b).then(() => {
      console.log('file saved...')
    })
  })
}

function fetchAndDownload() {
  fetchImageUrls().then(images => {
    images.forEach(image => {
      if (downloadedImages.includes(image.src)) {
        console.log("image has been downloaded, ignoring...")
        return
      }

      downloadNewImage(image).then(() => {
        downloadedImages.push(image.src)
      })
    })
  })
}

const min = 60 * 1000
setInterval(fetchAndDownload, 15 * min)
fetchAndDownload()
