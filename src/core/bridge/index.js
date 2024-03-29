import { uuid } from '@native/utils/util';
import { WebView } from '@native/core/webview/webview';

export class Bridge {
  constructor(opts) {
    this.id = `bridge_${uuid()}`;
    this.opts = opts;
    this.webView = null;
    this.jscore = opts.jscore;
    this.parent = null;
    this.status = 0;
    this.jscore.addEventListener('message', this.jscoreMessageHandle.bind(this));
  }

  jscoreMessageHandle(msg) {
    const { type, body } = msg;
    if (body.bridgeId !== this.id) {
      return;
    }
    switch (type) {
      case 'logicResourceLoaded':
        this.status++;
        this.createApp();
        break;
      case 'appIsCreated':
        this.status++;
        this.notifyMarkInitialData();
        break;
      case 'initialDataIsReady':
        this.status++;
        this.setInitialData(msg);
        break;
      case 'updateModule':
        this.updateModule(msg);
        break;
      case 'showToast':
        this.showToast(msg);
        break;
    }
  }

  UIMessageHandle(msg) {
    const { type, body } = msg;

    switch (type) {
      case 'uiResourceLoaded':
        this.status++;
        this.createApp();
        break;
      case 'moduleCreated':
        this.uiInstanceCreated(body);
        break;
      case 'moduleMounted':
        this.uiInstanceMounted(body);
        break;
      case 'pageScroll':
        this.pageScroll(body);
        break;
      case 'triggerEvent':
        this.triggerEvent(body);
        break;
    }
  }

  showToast(msg) {
    const { params } = msg.body;
    this.webView.postMessage({
      type: 'showToast',
      body: { ...params },
    });
  }

  updateModule(msg) {
    const { id, data } = msg.body;
    this.webView.postMessage({
      type: 'updateModule',
      body: {
        id,
        data,
      },
    });
  }

  triggerEvent(msg) {
    this.jscore.postMessage({
      type: 'triggerEvent',
      body: msg,
    });
  }

  pageScroll(msg) {
    this.jscore.postMessage({
      type: 'pageScroll',
      body: msg,
    });
  }

  uiInstanceMounted(msg) {
    const { id } = msg;
    this.jscore.postMessage({
      type: 'moduleMounted',
      body: {
        id,
      },
    });
  }

  uiInstanceCreated(msg) {
    const { id, path } = msg;
    this.jscore.postMessage({
      type: 'createInstance',
      body: {
        id,
        path,
        bridgeId: this.id,
        query: this.opts.query,
      },
    });
  }

  notifyMarkInitialData() {
    this.jscore.postMessage({
      type: 'markPageInitialData',
      body: {
        bridgeId: this.id,
        pagePath: this.opts.pagePath,
      },
    });
  }

  start() {
    // 通知渲染线程加载资源
    this.webView.postMessage({
      type: 'loadResource',
      body: {
        appId: this.opts.appId,
        pages: this.opts.pages,
      },
    });
    // 通知逻辑线程加载资源
    this.jscore.postMessage({
      type: 'loadResource',
      body: {
        appId: this.opts.appId,
        bridgeId: this.id,
        pages: this.opts.pages,
      },
    });
  }

  startWithoutLogic() {
    this.status++;
    // 发送通知给webview，加载页面模板资源
    this.webView.postMessage({
      type: 'loadResource',
      body: {
        appId: this.opts.appId,
        pages: this.opts.pages,
      },
    });
  }

  appShow() {
    if (this.status < 2) {
      return;
    }
    this.jscore.postMessage({
      type: 'appShow',
      body: {},
    });
  }

  appHide() {
    if (this.status < 2) {
      return;
    }
    this.jscore.postMessage({
      type: 'appHide',
      body: {},
    });
  }

  pageShow() {
    if (this.status < 2) {
      return;
    }
    this.jscore.postMessage({
      type: 'pageShow',
      body: {
        bridgeId: this.id,
      },
    });
  }

  pageHide() {
    if (this.status < 2) {
      return;
    }
    this.jscore.postMessage({
      type: 'pageHide',
      body: {
        bridgeId: this.id,
      },
    });
  }
  destroy() {
    if (this.status < 2) {
      return;
    }
    this.jscore.postMessage({
      type: 'pageUnload',
      body: {
        bridgeId: this.id,
      },
    });
  }

  async init() {
    this.webView = await this.createWebView();
    this.webView.addEventListener('message', this.UIMessageHandle.bind(this));
  }

  createWebView() {
    return new Promise((resolve) => {
      const webView = new WebView({
        isRoot: this.opts.isRoot,
        configInfo: this.opts.configInfo,
      });
      webView.parent = this;
      webView.init(() => {
        resolve(webView);
      });
      this.parent.webViewContainer.appendChild(webView.el);
    });
  }

  setInitialData(msg) {
    const { initialData } = msg.body;
    this.webView.postMessage({
      type: 'setInitialData',
      body: {
        initialData,
        bridgeId: this.id,
        pagePath: this.opts.pagePath,
      },
    });
  }

  createApp() {
    if (this.status !== 2) {
      return;
    }
    // 通知逻辑线程
    this.jscore.postMessage({
      type: 'createApp',
      body: {
        bridgeId: this.id,
        scene: this.opts.scene,
        pagePath: this.opts.pagePath,
        query: this.opts.query,
      },
    });
  }
}
