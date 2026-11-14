import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

type Tab = "Analysis" | "Manual" | "History" | "Settings";
type Signal = { direction: "UP" | "DOWN" | "WAIT"; score: number; reasons: string[]; time: string };

const C = { bg: "#07111f", panel: "#101e30", panel2: "#14263b", line: "#263b52", cyan: "#35d6ed", green: "#25d69a", red: "#ff647c", muted: "#8ea3ba", white: "#f4f8ff", yellow: "#f5c96a" };

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let out = values[0];
  for (let i = 1; i < values.length; i++) out = values[i] * k + out * (1 - k);
  return out;
}
function calcSignal(values: number[]): Signal {
  if (values.length < 26) return { direction: "WAIT", score: 0, reasons: ["कम-से-कम 26 closing prices डालें"], time: new Date().toLocaleTimeString() };
  const fast = ema(values.slice(-30), 9), slow = ema(values.slice(-30), 21);
  const changes = values.slice(1).map((v, i) => v - values[i]);
  const gains = changes.slice(-14).filter(v => v > 0).reduce((a, b) => a + b, 0) / 14;
  const losses = Math.abs(changes.slice(-14).filter(v => v < 0).reduce((a, b) => a + b, 0)) / 14;
  const rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
  const reasons: string[] = [];
  let up = 0, down = 0;
  if (fast > slow) { up++; reasons.push("EMA 9, EMA 21 से ऊपर"); }
  else { down++; reasons.push("EMA 9, EMA 21 से नीचे"); }
  if (rsi < 35) { up++; reasons.push(`RSI ${rsi.toFixed(1)}: oversold zone`); }
  else if (rsi > 65) { down++; reasons.push(`RSI ${rsi.toFixed(1)}: overbought zone`); }
  else reasons.push(`RSI ${rsi.toFixed(1)}: neutral zone`);
  const momentum = values[values.length - 1] - values[values.length - 5];
  if (momentum > 0) { up++; reasons.push("पिछली 5 candles का momentum ऊपर"); }
  else if (momentum < 0) { down++; reasons.push("पिछली 5 candles का momentum नीचे"); }
  const score = Math.round(Math.max(up, down) / 3 * 100);
  const direction = up >= 2 && up > down ? "UP" : down >= 2 && down > up ? "DOWN" : "WAIT";
  return { direction, score, reasons, time: new Date().toLocaleTimeString() };
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Analysis");
  const [timeframe, setTimeframe] = useState<"1 MIN" | "5 MIN">("1 MIN");
  const [pricesText, setPricesText] = useState("100,101,100.5,102,103,102.5,104,103.5,105,106,105.5,107,108,107.5,109,110,109.5,111,112,111.5,113,114,113.5,115,116,115.5,117,118,117.5,119");
  const [history, setHistory] = useState<Signal[]>([]);
  const [demo, setDemo] = useState(true);
  const prices = useMemo(() => pricesText.split(/[,\s]+/).map(Number).filter(n => Number.isFinite(n)), [pricesText]);
  const signal = useMemo(() => calcSignal(prices), [prices]);
  const color = signal.direction === "UP" ? C.green : signal.direction === "DOWN" ? C.red : C.yellow;

  const runAnalysis = () => setHistory(old => [signal, ...old].slice(0, 30));
  const tabs: Tab[] = ["Analysis", "Manual", "History", "Settings"];

  return (
    <SafeAreaView style={s.safe}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <View><Text style={s.brand}>SMART<Text style={{color:C.cyan}}>TRADE</Text>AI</Text><Text style={s.sub}>BINOMO EDITION · ANALYSIS COMPANION</Text></View>
        <View style={s.livePill}><View style={s.dot}/><Text style={s.liveText}>DEMO MODE</Text></View>
      </View>
      <View style={s.tabs}>{tabs.map(t => <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab===t && s.tabActive]}><Text style={[s.tabText, tab===t && {color:C.cyan}]}>{t}</Text></TouchableOpacity>)}</View>
      <ScrollView contentContainerStyle={s.content}>
        {tab === "Analysis" && <>
          <View style={s.welcome}><Text style={s.h1}>Market Analysis</Text><Text style={s.muted}>अपना candle data डालें और indicators के आधार पर analysis करें।</Text></View>
          <View style={s.row}>
            {(["1 MIN","5 MIN"] as const).map(v => <TouchableOpacity key={v} onPress={() => setTimeframe(v)} style={[s.tf, timeframe===v && s.tfOn]}><Text style={[s.tfText,timeframe===v && {color:C.bg}]}>{v}</Text></TouchableOpacity>)}
            <View style={s.demoTag}><Text style={s.demoTagText}>● {demo ? "PRACTICE" : "MANUAL"}</Text></View>
          </View>
          <View style={s.signalCard}>
            <Text style={s.cardLabel}>CURRENT SIGNAL · {timeframe}</Text>
            <Text style={[s.signalWord,{color}]}>{signal.direction}</Text>
            <Text style={s.score}>Signal score: {signal.score}%</Text>
            <View style={s.track}><View style={[s.fill,{width:`${signal.score}%`,backgroundColor:color}]}/></View>
            <Text style={s.disclaimer}>यह गणना आपके डाले हुए closing prices पर आधारित है, live Binomo feed नहीं है।</Text>
            <TouchableOpacity style={s.primary} onPress={runAnalysis}><Text style={s.primaryText}>SAVE SIGNAL TO HISTORY</Text></TouchableOpacity>
          </View>
          <View style={s.card}><Text style={s.cardTitle}>Indicator reasoning</Text>{signal.reasons.map((r,i)=><View style={s.reason} key={i}><Text style={s.check}>✓</Text><Text style={s.reasonText}>{r}</Text></View>)}</View>
          <View style={s.card}><Text style={s.cardTitle}>Closing prices</Text><Text style={s.muted}>Comma-separated values · कम-से-कम 26 values</Text><TextInput multiline value={pricesText} onChangeText={setPricesText} style={s.input} placeholder="100, 101, 102..." placeholderTextColor={C.muted}/><Text style={s.small}>Loaded values: {prices.length}</Text></View>
        </>}
        {tab === "Manual" && <><Text style={s.h1}>Manual Signal</Text><Text style={s.muted}>Chart देखकर values खुद भरें। यह signal सलाह नहीं है।</Text><View style={s.card}><Text style={s.cardTitle}>Quick checklist</Text>{["Trend: EMA 9 और EMA 21","Momentum: RSI 14","MACD direction और crossover","Bollinger Bands position","Stochastic confirmation","ATR से volatility जाँचें"].map((x,i)=><Text key={i} style={s.reasonText}>□  {x}</Text>)}</View><View style={s.card}><Text style={s.cardTitle}>Your decision</Text><Text style={s.muted}>सभी indicators एक दिशा में न हों तो WAIT चुनना बेहतर हो सकता है।</Text>{["UP","DOWN","WAIT"].map(x=><TouchableOpacity key={x} onPress={()=>setHistory(old=>[{direction:x as Signal["direction"],score:0,reasons:["Manual entry by user"],time:new Date().toLocaleTimeString()},...old].slice(0,30))} style={s.manualBtn}><Text style={{color:x==="UP"?C.green:x==="DOWN"?C.red:C.yellow,fontWeight:"800"}}>SAVE {x}</Text></TouchableOpacity>)}</View></>}
        {tab === "History" && <><Text style={s.h1}>Signal History</Text><Text style={s.muted}>इस device session में सेव किए गए signals</Text>{history.length===0?<View style={s.card}><Text style={s.muted}>अभी कोई signal सेव नहीं है। Analysis टैब में जाकर Save Signal दबाएँ।</Text></View>:history.map((h,i)=><View key={i} style={s.historyRow}><View><Text style={{color:h.direction==="UP"?C.green:h.direction==="DOWN"?C.red:C.yellow,fontWeight:"900",fontSize:18}}>{h.direction}</Text><Text style={s.small}>{h.time}</Text></View><Text style={s.muted}>{h.score}% score</Text></View>)}</>}
        {tab === "Settings" && <><Text style={s.h1}>Settings & Help</Text><View style={s.card}><Text style={s.cardTitle}>Practice mode</Text><Text style={s.muted}>Demo mode में केवल manually entered/sample data का उपयोग करें।</Text><TouchableOpacity style={s.primary} onPress={()=>setDemo(!demo)}><Text style={s.primaryText}>{demo?"TURN OFF PRACTICE LABEL":"TURN ON PRACTICE LABEL"}</Text></TouchableOpacity></View><View style={s.card}><Text style={s.cardTitle}>Important limitations</Text><Text style={s.reasonText}>• यह Binomo का official app या API integration नहीं है।</Text><Text style={s.reasonText}>• Live prices अपने-आप नहीं पढ़े जाते।</Text><Text style={s.reasonText}>• Screenshot permission अपने-आप candle recognition नहीं करती।</Text><Text style={s.reasonText}>• कोई signal जीत या profit की guarantee नहीं देता।</Text><Text style={s.reasonText}>• RSI/EMA आधारित शुरुआती analysis है; MACD, Bollinger, Stochastic और ATR अभी checklist में हैं, automated calculation नहीं।</Text></View></>}
        <Text style={s.footer}>SMARTTRADEAI · LEARN, ANALYSE, PRACTISE RESPONSIBLY</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},header:{paddingHorizontal:20,paddingTop:12,paddingBottom:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{color:C.white,fontSize:23,fontWeight:"900",letterSpacing:1},sub:{color:C.muted,fontSize:9,letterSpacing:1.1,marginTop:3},livePill:{backgroundColor:"#12332f",paddingHorizontal:10,paddingVertical:7,borderRadius:20,flexDirection:"row",alignItems:"center",gap:6},dot:{width:6,height:6,borderRadius:5,backgroundColor:C.green},liveText:{color:C.green,fontSize:9,fontWeight:"800"},tabs:{flexDirection:"row",marginHorizontal:14,backgroundColor:C.panel,borderRadius:13,padding:4},tab:{flex:1,paddingVertical:11,alignItems:"center",borderRadius:10},tabActive:{backgroundColor:C.panel2},tabText:{color:C.muted,fontSize:11,fontWeight:"700"},content:{padding:16,paddingBottom:35},welcome:{marginBottom:18},h1:{color:C.white,fontSize:24,fontWeight:"900",marginBottom:6},muted:{color:C.muted,fontSize:12,lineHeight:19},row:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:14},tf:{paddingVertical:9,paddingHorizontal:17,borderRadius:9,borderWidth:1,borderColor:C.line},tfOn:{backgroundColor:C.cyan,borderColor:C.cyan},tfText:{color:C.muted,fontWeight:"800",fontSize:11},demoTag:{marginLeft:"auto",backgroundColor:C.panel2,padding:9,borderRadius:8},demoTagText:{color:C.green,fontSize:9,fontWeight:"900"},signalCard:{backgroundColor:C.panel,borderRadius:18,padding:18,borderWidth:1,borderColor:C.line,alignItems:"center",marginBottom:14},cardLabel:{color:C.muted,fontSize:10,letterSpacing:1,fontWeight:"800"},signalWord:{fontSize:48,fontWeight:"900",marginTop:8},score:{color:C.white,fontSize:13,fontWeight:"700",marginTop:3},track:{height:7,backgroundColor:C.line,borderRadius:10,width:"100%",marginTop:12,overflow:"hidden"},fill:{height:7,borderRadius:10},disclaimer:{color:C.muted,fontSize:10,lineHeight:16,textAlign:"center",marginTop:13},primary:{backgroundColor:C.cyan,borderRadius:10,paddingVertical:13,paddingHorizontal:15,alignItems:"center",width:"100%",marginTop:15},primaryText:{color:C.bg,fontSize:11,fontWeight:"900",letterSpacing:.5},card:{backgroundColor:C.panel,borderRadius:16,padding:16,borderWidth:1,borderColor:C.line,marginBottom:13},cardTitle:{color:C.white,fontWeight:"800",fontSize:15,marginBottom:10},reason:{flexDirection:"row",gap:9,marginVertical:5,alignItems:"center"},check:{color:C.green,fontWeight:"900"},reasonText:{color:"#c3d1e0",fontSize:12,lineHeight:20,marginVertical:3},input:{backgroundColor:C.bg,borderColor:C.line,borderWidth:1,borderRadius:10,color:C.white,padding:12,minHeight:105,textAlignVertical:"top",marginTop:10,fontSize:12},small:{color:C.muted,fontSize:10,marginTop:7},manualBtn:{backgroundColor:C.bg,borderColor:C.line,borderWidth:1,borderRadius:10,padding:14,alignItems:"center",marginTop:9},historyRow:{backgroundColor:C.panel,padding:15,borderRadius:12,marginTop:9,flexDirection:"row",justifyContent:"space-between",alignItems:"center",borderWidth:1,borderColor:C.line},footer:{textAlign:"center",color:"#61768d",fontSize:9,letterSpacing:1,marginTop:16}
});
