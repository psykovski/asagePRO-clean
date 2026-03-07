package com.psykovski.masagepro;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    @Override
    public void onResume() {
        super.onResume();
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings s = webView.getSettings();
                s.setBuiltInZoomControls(false);
                s.setSupportZoom(false);
                s.setDisplayZoomControls(false);
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);
            }
        } catch (Exception ignored) {}
    }
}
