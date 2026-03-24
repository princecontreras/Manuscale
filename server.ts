import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { generateImageFromPrompt } from './services/geminiService';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('generate-image', async (data: { prompt: string; id: string }) => {
        const { prompt, id } = data;
        try {
            const imageUrl = await generateImageFromPrompt(prompt);
            if (imageUrl) {
                socket.emit('image-generated', { id, url: imageUrl });
            } else {
                socket.emit('image-error', { id, error: 'Generation failed' });
            }
        } catch (e) {
            socket.emit('image-error', { id, error: 'Generation failed' });
        }
    });
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
