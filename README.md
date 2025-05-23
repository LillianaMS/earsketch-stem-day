# EarSketch Webclient – Puerto Rico 2025 NSF STEM Day Celebration

This customized version of the EarSketch Webclient was developed for the 2025 NSF STEM Day celebration in Puerto Rico, as part of **'Proyecto Remezcla'**. The event, held at the island's busiest shopping center, offered visitors a 15-minute hands-on activity: programming a Mother's Day-themed song. The activity was designed to be quick, engaging, and accessible for first-time users.

Participants created short musical compositions using a simplified interface and recorded voice messages. These were embedded into personalized Mother's Day cards via QR codes, allowing recipients to listen to the songs at home.

## Key Modifications

- **Simplified Sound Loop Selection**  
  The sound loop list was limited to 25 sounds and organized by genre and key to help users more easily combine sounds.

- **Customized Script Creation Form**  
  Participants entered their QR code, name, and email. After submission, a code template was generated using their first name and QR code for the script name.

- **Event Tutorial Pane**  
  The "Curriculum" pane was replaced with a step-by-step event tutorial, supported by YouTube video guides.

- **Blocks Mode as Default**  
  Blocks mode was set as the default to minimize user errors. Only essential API blocks were included:  
  - from earsketch import * 
  - setTempo()
  - fitMedia()
  - setEffect()
  - insertMedia()

- **Hidden API Component**  
  The full API view was disabled to keep the experience streamlined for short sessions.

- **Simplified SoundUploader**  
  The component was modified to display only the recorder. It:
  - Removes the metronome
  - Adds a 30-second countdown
  - Saves recordings using the user’s QR code and first name

- **"Send" Button in Editor Header**  
  A new button allows users to:
  - Convert their song to MP3
  - Upload it to the event server
  - Access it later via QR code

- **Submission Confirmation & Feedback**  
  After submission, a modal confirms the upload and provides a **Qualtrics feedback link** for participants.



## Getting Started

Run EarSketch on your local machine for development and testing purposes.

### Installing

Install JavaScript dependencies. Node.js v14 required.

```bash
npm install
```

Run the app in development mode.

```bash
npm run serve
```

In your web browser, go to [http://localhost:8888](http://localhost:8888). Start the quick tour, "run", and "play".

### Available Scripts

- `npm run serve` - Run the app in the development mode

- `npm run serve-local` - Build for local serving from the `build` folder

- `npm run build` - Build the app for production to the `build` folder

- `npm run test` - Run unit tests and sample scripts

- `npm run test-jest` - Run component tests

- `npm run test-cypress` - Run e2e tests

- `npm run test-cypress-gui` - Run e2e tests in a GUI

## Deployment

Production deployments should use `npm run build` with additional command-line options. See `webpack.build.js` for details.

The curriculum HTML is sourced elsewhere, by following the `curriculum` soft link. These files can be omitted, and are not publicly available at this time.

## Issues / Contact

Please use our contact form at https://earsketch.gatech.edu/landing/#/contact.

## Contributing

The EarSketch webclient is not accepting outside contributions at this time. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
