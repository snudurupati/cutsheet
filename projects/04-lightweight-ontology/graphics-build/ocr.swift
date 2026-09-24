// Screen OCR with macOS's built-in Vision framework: no model download, no
// third-party dependency. Used to time and locate punch-in targets from the text
// actually on screen, because the speech runs ahead of the typing (a punch-in
// timed to the words zoomed into text that did not exist yet, found 2026-09-22).
//
// usage: swift ocr.swift <image.png> [<image.png> ...]
// prints, per image: "## <path>" then one line per text run:
//   x y w h<TAB>text     (pixels in the input image, origin top-left)
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("## \(path)\nERROR could not read"); continue
    }
    let W = Double(cg.width), H = Double(cg.height)
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.usesLanguageCorrection = false
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    try? handler.perform([req])
    print("## \(path)")
    for obs in (req.results ?? []) {
        guard let top = obs.topCandidates(1).first else { continue }
        let b = obs.boundingBox          // normalised, origin bottom-left
        let x = Int(b.minX * W), w = Int(b.width * W)
        let h = Int(b.height * H), y = Int((1 - b.maxY) * H)
        print("\(x) \(y) \(w) \(h)\t\(top.string)")
    }
}
