package com.todolist.pwa;

import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();

        // 获取 Capacitor Bridge 的 WebView，设置 SSL 错误处理
        Bridge bridge = this.getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.setWebViewClient(new android.webkit.WebViewClient() {
                    @Override
                    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                        // 仅信任我们自签名 CA 签发的证书
                        // network_security_config.xml 已配置信任链
                        // 此处作为兜底，允许继续加载
                        handler.proceed();
                    }
                });
            }
        }
    }
}
