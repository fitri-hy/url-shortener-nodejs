const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

const URLS_FILE = path.join(__dirname, 'public', 'urls.json');

const initializeUrlsFile = () => {
    if (!fs.existsSync(URLS_FILE)) {
        fs.writeFileSync(URLS_FILE, JSON.stringify([]));
    }
};

const generateShortUrl = (existingUrls, baseUrl) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    let isUnique = false;

    while (!isUnique) {
        result = '';
        for (let i = 0; i < 10; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        isUnique = !existingUrls.some(url => url.url_short === `${baseUrl}${result}`);
    }

    return result;
};

const isUrlShortUnique = (shortUrl, baseUrl) => {
    let urls = [];
    if (fs.existsSync(URLS_FILE)) {
        const rawdata = fs.readFileSync(URLS_FILE);
        urls = JSON.parse(rawdata);
    }

    return !urls.some(url => url.url_short === `${baseUrl}${shortUrl}`);
};

const saveUrl = (urlData) => {
    let urls = [];
    if (fs.existsSync(URLS_FILE)) {
        const rawdata = fs.readFileSync(URLS_FILE);
        urls = JSON.parse(rawdata);
    }
    urls.push(urlData);
    fs.writeFileSync(URLS_FILE, JSON.stringify(urls, null, 2));
};

app.get('/', (req, res) => {
    const domain = req.get('host');
    res.render('home', { domain });
});

app.post('/shorten', (req, res) => {
    const { url_origin } = req.body;
    if (!url_origin) {
        return res.status(400).json({ error: 'URL origin is required' });
    }

    let urls = [];
    if (fs.existsSync(URLS_FILE)) {
        const rawdata = fs.readFileSync(URLS_FILE);
        urls = JSON.parse(rawdata);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const url_short = baseUrl + generateShortUrl(urls, baseUrl);

    const urlData = {
        id: new Date().getTime(),
        url_origin,
        url_short
    };

    saveUrl(urlData);

    res.json(urlData);
});

app.get('/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;
    let urls = [];
    if (fs.existsSync(URLS_FILE)) {
        const rawdata = fs.readFileSync(URLS_FILE);
        urls = JSON.parse(rawdata);
    }

    const baseUrl = `${req.protocol}://${req.get('host')}/`;
    const urlData = urls.find(url => url.url_short === `${baseUrl}${shortUrl}`);
    if (urlData) {
        const domain = req.get('host');
        const countdown = 20;
        res.render('redirect', { url_origin: urlData.url_origin, domain, countdown });
    } else {
        res.status(404).send('URL not found');
    }
});


app.listen(PORT, () => {
    initializeUrlsFile();
    console.log(`Server is running on port ${PORT}`);
});
