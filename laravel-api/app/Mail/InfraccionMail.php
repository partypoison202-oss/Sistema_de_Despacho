<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Infraccion;

class InfraccionMail extends Mailable
{
    use Queueable, SerializesModels;

    public $infraccion;
    public $pdfPath;
    public $pdfName;

    /**
     * Create a new message instance.
     */
    public function __construct(Infraccion $infraccion, string $pdfPath, string $pdfName)
    {
        $this->infraccion = $infraccion;
        $this->pdfPath = $pdfPath;
        $this->pdfName = $pdfName;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Boleta de Infracción - Folio ' . $this->infraccion->folio,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.infraccion',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [
            Attachment::fromPath($this->pdfPath)
                ->as($this->pdfName)
                ->withMime('application/pdf'),
        ];
    }
}
