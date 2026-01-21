import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(private readonly mailerService: MailerService) { }

    async sendInvitation(email: string, token: string) {
        const url = `http://localhost:5173/auth/accept-invite?token=${token}`;

        try {
            await this.mailerService.sendMail({
                to: email,
                subject: 'Invitation à rejoindre Mediplan',
                template: './invitation', // .ejs extension is added automatically
                context: {
                    email,
                    url,
                },
            });
            this.logger.log(`Invitation sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send invitation to ${email}`, error.stack);
            // Fallback: Log the link to the console for development
            this.logger.warn(`FALLBACK: Invitation link for ${email}: ${url}`);
        }
    }
}
