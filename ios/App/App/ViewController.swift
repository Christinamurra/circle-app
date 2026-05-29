import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func webViewDidLoad() {
        super.webViewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
    }
}
