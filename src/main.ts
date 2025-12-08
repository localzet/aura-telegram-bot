import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {ConfigService} from '@nestjs/config';
import {Logger} from '@nestjs/common';
import {NestExpressApplication} from '@nestjs/platform-express';
import {join} from 'path';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const config = app.get(ConfigService);
    const logger = new Logger('Bootstrap');
    
    app.enableCors({
        origin: true,
        credentials: true,
    });

    // In production, admin panel is served on separate port (3001) via vite preview
    // Only serve static files if they exist (for backward compatibility)
    const adminPath = join(__dirname, 'admin');
    try {
        // Get Express instance for custom routing
        const expressApp = app.getHttpAdapter().getInstance();
        
        // Helper function to check if request is for API
        const isApiRequest = (path: string): boolean => {
            return path.startsWith('/admin/auth') ||
                   path.startsWith('/admin/users') ||
                   path.startsWith('/admin/purchases') ||
                   path.startsWith('/admin/analytics') ||
                   path.startsWith('/admin/promocodes') ||
                   path.startsWith('/admin/blacklist') ||
                   path.startsWith('/admin/referrals') ||
                   path.startsWith('/admin/stats') ||
                   path.startsWith('/admin/config');
        };
        
        // Only serve static files if admin directory exists (backward compatibility)
        const fs = require('fs');
        if (fs.existsSync(adminPath)) {
            // Middleware to handle API requests - must be BEFORE static assets
            expressApp.use('/admin', (req: any, res: any, next: any) => {
                // If it's an API request, let NestJS handle it
                if (isApiRequest(req.path)) {
                    return next();
                }
                // Otherwise continue to static assets or SPA routing
                next();
            });
            
            // Serve static assets (CSS, JS, images, etc.) from /admin/assets
            app.useStaticAssets(adminPath, {
                prefix: '/admin',
                index: false,
            });
            
            // Serve admin panel index.html for SPA routes
            expressApp.get('/admin', (req: any, res: any, next: any) => {
                if (isApiRequest(req.path)) {
                    return next();
                }
                res.sendFile(join(adminPath, 'index.html'));
            });

            expressApp.get('/admin/*', (req: any, res: any, next: any) => {
                if (isApiRequest(req.path)) {
                    return next();
                }
                
                // If it's a file request (has extension), let static assets handler deal with it
                if (req.path.match(/\.[^/]+$/)) {
                    return next();
                }
                
                // Otherwise serve index.html for SPA routing
                res.sendFile(join(adminPath, 'index.html'));
            });
        }
    } catch (error) {
        logger.warn('Admin panel static files not found, skipping... (Admin panel should be served on port 3001)');
    }

    const port = config.get<number>('APP_PORT', 3000);
    await app.listen(port, '0.0.0.0');
    
    logger.log(`Bot server listening on port ${port}`);
    logger.log(`Admin panel API available at http://localhost:${port}/admin`);
    logger.log(`Admin panel frontend should be served on port 3001`);
}

bootstrap();
