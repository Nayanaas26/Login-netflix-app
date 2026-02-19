const CATEGORIES = [
    {
        genre: "Trending Now",
        query: "2024",
        isLarge: false
    },
    {
        genre: "Netflix Originals",
        query: "Netflix",
        isLarge: true
    },
    {
        genre: "Action Thrillers",
        query: "Action",
        isLarge: false
    },
    {
        genre: "Sci-Fi & Fantasy",
        query: "Sci-Fi",
        isLarge: false
    },
    {
        genre: "Horror",
        query: "Horror",
        isLarge: false
    },
    {
        genre: "Comedy",
        query: "Comedy",
        isLarge: false
    },
    {
        genre: "Documentaries",
        query: "Documentary",
        isLarge: false
    },
    {
        genre: "Romance",
        query: "Romance",
        isLarge: false
    }
];

const API_BASE_URL = 'https://imdb.iamidiotareyoutoo.com/search?q=';

async function fetchMovies(query) {
    try {
        const response = await fetch(`${API_BASE_URL}${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.description || [];
    } catch (err) {
        console.error(`Failed to fetch movies for query "${query}":`, err);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const userNameElement = document.getElementById('user-name');
    const movieRowsContainer = document.getElementById('movie-rows');
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');
    const navbar = document.getElementById('navbar');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.style.backgroundColor = '#141414';
        } else {
            navbar.style.backgroundColor = 'transparent';
        }
    });

    // Fetch user info from session
    try {
        const response = await fetch('/api/me');
        if (response.ok) {
            const data = await response.json();
            userNameElement.textContent = `Welcome, ${data.user.fullname}`;
        } else {
            window.location.href = '/';
        }
    } catch (err) {
        console.error('Failed to fetch user data:', err);
        window.location.href = '/';
    }

    // Load dynamic content
    for (const category of CATEGORIES) {
        const movies = await fetchMovies(category.query);

        // Render Hero Content if it's the first movie of the first row
        if (category === CATEGORIES[0] && movies.length > 0) {
            heroTitle.textContent = movies[0]["#TITLE"];
            heroDesc.textContent = movies[0]["#ACTORS"] || "An IMDbOT Original Production. Stream now for free.";
            document.getElementById('hero-banner').style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(20,20,20,1) 100%), url(${movies[0]["#IMG_POSTER"]})`;
        }

        renderRow(category, movies);
    }

    function renderRow(category, movies) {
        if (movies.length === 0) return;

        const row = document.createElement('section');
        row.className = 'row';

        const h2 = document.createElement('h2');
        h2.textContent = category.genre;
        row.appendChild(h2);

        // Navigation Handles
        const leftHandle = document.createElement('button');
        leftHandle.className = 'handle handle-left';
        leftHandle.innerHTML = '&#8249;';

        const rightHandle = document.createElement('button');
        rightHandle.className = 'handle handle-right';
        rightHandle.innerHTML = '&#8250;';

        const thumbnails = document.createElement('div');
        thumbnails.className = 'thumbnails';

        // Scroll Logic
        leftHandle.addEventListener('click', () => {
            thumbnails.scrollLeft -= thumbnails.clientWidth * 0.8;
        });

        rightHandle.addEventListener('click', () => {
            thumbnails.scrollLeft += thumbnails.clientWidth * 0.8;
        });

        movies.forEach(movie => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${category.isLarge ? 'large' : ''}`;

            const img = document.createElement('img');
            img.src = movie["#IMG_POSTER"] || movie["#IMDB_IV"];
            img.alt = movie["#TITLE"];
            img.loading = "lazy";

            img.onerror = () => {
                img.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=500&auto=format&fit=crop';
            };

            const title = document.createElement('div');
            title.className = 'movie-title';
            title.textContent = movie["#TITLE"];

            if (category.isLarge) {
                const nLogo = document.createElement('div');
                nLogo.className = 'n-logo';
                nLogo.textContent = 'N';
                thumb.appendChild(nLogo);
            }

            thumb.appendChild(img);
            thumb.appendChild(title);
            thumbnails.appendChild(thumb);
        });

        row.appendChild(leftHandle);
        row.appendChild(thumbnails);
        row.appendChild(rightHandle);
        movieRowsContainer.appendChild(row);
    }
});
