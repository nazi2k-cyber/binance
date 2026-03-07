# Binance Algo Trading Mobile Web

바이낸스 API를 활용한 알고리즘 트레이딩 모바일 웹 애플리케이션

## Features

- **실시간 시세 조회** - WebSocket 기반 실시간 가격 스트리밍
- **캔들스틱 차트** - 다양한 타임프레임 지원 (1m, 5m, 15m, 1h, 4h, 1d)
- **알고리즘 트레이딩 전략**
  - SMA Crossover (이동평균 교차)
  - RSI Oversold/Overbought (과매도/과매수)
  - MACD Signal
  - Bollinger Band Bounce (볼린저 밴드 바운스)
  - Combined Strategy (복합 전략)
- **자동매매 봇** - 설정한 전략에 따라 자동으로 매매 시그널 생성
- **주문 기능** - 시장가/지정가 매수/매도
- **포트폴리오** - 잔고 및 미체결 주문 조회
- **모바일 최적화** - 터치 친화적 반응형 UI

## Setup

```bash
# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your Binance API keys

# Start server
npm run dev
```

Open `http://localhost:3000` in your mobile browser.

## API Keys

1. Go to [Binance API Management](https://www.binance.com/en/my/settings/api-management)
2. Create a new API key
3. For testing, use the [Binance Testnet](https://testnet.binance.vision/)

## Tech Stack

- **Backend**: Node.js, Express, WebSocket
- **Frontend**: Vanilla JS, Canvas charts
- **API**: Binance REST API + WebSocket Streams
