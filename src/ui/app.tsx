import { Box, Text, useApp, useInput, useStdout } from "ink";
import React from "react";
import { ApiError } from "../api/client.js";
import { demoModels } from "../api/demo.js";
import { FileCache } from "../core/cache.js";
import { KeyStore, getConfigPaths } from "../core/config.js";
import { DataService } from "../core/data.js";
import { Footer } from "./footer.js";
import { Help } from "./help.js";
import { cycleTab, errorMessage, isNarrow, keyToAction } from "./logic.js";
import { loadSavedPlotPins } from "./pin-persistence.js";
import { Onboarding } from "./onboarding.js";
import { Placeholder } from "./placeholder.js";
import { setState, useAppState, type ModelsData } from "./store.js";
import { TabBar } from "./tabbar.js";
import { ModelsTab } from "./tabs/models.js";
import { PlotTab } from "./tabs/plot.js";

export interface AppProps {
  demo?: boolean;
  offline?: boolean;
  ascii?: boolean;
  creator?: string | null;
  minQuality?: number | null;
  maxCost?: number | null;
  cheap?: boolean;
  keyStore?: KeyStore;
  serviceFactory?: (apiKey: string) => DataService;
  widthOverride?: number;
}

function seedDemo() {
  const now = Date.now();
  const data: ModelsData = {
    models: demoModels(),
    rateLimit: { limit: 100, remaining: 96, reset: Math.floor(now / 1000) + 86_400 },
    indexVersion: 4.1,
    storedAt: now,
    fromCache: false,
    stale: false,
  };
  setState({ screen: "main", demo: true, error: null, data });
}

function TabContent(props: { narrow: boolean; width: number; ascii: boolean }) {
  const state = useAppState();
  switch (state.tab) {
    case "models":
      return (
        <ModelsTab
          models={state.data.models}
          filters={state.filters}
          sort={state.sort}
          sortAsc={state.sortAsc}
          selectedIndex={state.selectedIndex}
          detailOpen={state.detailOpen}
          searchOpen={state.searchOpen}
          width={props.width}
        />
      );
    case "plot":
      return (
        <PlotTab
          models={state.data.models}
          ascii={props.ascii}
          width={props.width}
          yField={state.plotY}
        />
      );
    case "compare":
      return (
        <Placeholder
          title="Compare"
          note={props.narrow ? "side-by-side rows — later" : "side-by-side rows for chosen slugs — later"}
          modelCount={0}
        />
      );
    case "media":
      return (
        <Placeholder
          title="Media"
          note="arena Elo tables (TTS, image, video, music) — later"
          modelCount={0}
        />
      );
  }
}

export default function App(props: AppProps) {
  const state = useAppState();
  const { exit } = useApp();
  const { stdout } = useStdout();
  const width = props.widthOverride ?? stdout.columns ?? 120;

  const keyStore = React.useMemo(
    () => props.keyStore ?? new KeyStore(getConfigPaths().config),
    [props.keyStore],
  );
  const makeService = React.useMemo(() => {
    if (props.serviceFactory) return props.serviceFactory;
    return (apiKey: string) =>
      new DataService({
        apiKey,
        cache: new FileCache(getConfigPaths().cache),
        offline: props.offline ?? false,
      });
  }, [props.serviceFactory, props.offline]);

  const load = React.useCallback(
    async (apiKey: string) => {
      try {
        const snapshot = await makeService(apiKey).loadModels();
        setState({
          screen: "main",
          error: null,
          data: {
            models: snapshot.models,
            rateLimit: snapshot.rateLimit,
            indexVersion: snapshot.indexVersion,
            storedAt: snapshot.storedAt,
            fromCache: snapshot.fromCache,
            stale: snapshot.stale,
          },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await keyStore.clear();
          setState({
            apiKey: null,
            screen: "onboarding",
            error: "that key was rejected by the API (401) — check it and paste again",
          });
          return;
        }
        setState({ screen: "error", error: errorMessage(error) });
      }
    },
    [keyStore, makeService],
  );

  React.useEffect(() => {
    let active = true;
    setState({
      demo: props.demo ?? false,
      offline: props.offline ?? false,
      ascii: props.ascii ?? false,
      filters: {
        query: "",
        creator: props.creator ?? null,
        minQuality: props.minQuality ?? null,
        maxCost: props.maxCost ?? null,
        cheap: props.cheap ?? false,
      },
    });
    void (async () => {
      if (props.demo ?? false) {
        if (active) seedDemo();
        if (active) await loadSavedPlotPins();
        return;
      }
      const storedKey = await keyStore.read();
      if (!active) return;
      if (storedKey === null) {
        setState({ screen: "onboarding" });
        return;
      }
      setState({ apiKey: storedKey, screen: "loading" });
      await load(storedKey);
      if (active) await loadSavedPlotPins();
    })();
    return () => {
      active = false;
    };
  }, [
    keyStore,
    load,
    props.demo,
    props.offline,
    props.ascii,
    props.creator,
    props.minQuality,
    props.maxCost,
    props.cheap,
  ]);

  useInput((input, key) => {
    const action = keyToAction(input, key, state.screen, state.helpOpen, {
      tab: state.tab,
      detailOpen: state.detailOpen,
      searchOpen: state.searchOpen,
      presetInputOpen: state.presetInputOpen,
      presetListOpen: state.presetListOpen,
    });
    if (action === null) return;
    switch (action.type) {
      case "quit":
        exit();
        return;
      case "toggle-help":
        setState({ helpOpen: !state.helpOpen });
        return;
      case "close-overlay":
        setState({ helpOpen: false, detailOpen: false, searchOpen: false });
        return;
      case "next-tab":
        setState({ tab: cycleTab(state.tab, 1), detailOpen: false, searchOpen: false });
        return;
      case "prev-tab":
        setState({ tab: cycleTab(state.tab, -1), detailOpen: false, searchOpen: false });
        return;
      case "goto-tab":
        setState({ tab: action.tab, detailOpen: false, searchOpen: false });
        return;
      case "refresh": {
        if (state.demo) return;
        const apiKey = state.apiKey;
        if (apiKey === null) return;
        setState({ screen: "loading" });
        void load(apiKey);
        return;
      }
    }
  });

  if (state.screen === "onboarding") {
    return (
      <Onboarding
        error={state.error}
        onSubmit={(apiKey) => {
          void (async () => {
            await keyStore.write(apiKey);
            setState({ apiKey, screen: "loading", error: null });
            await load(apiKey);
          })();
        }}
      />
    );
  }
  if (state.screen === "loading") {
    return <Text>loading models…</Text>;
  }
  if (state.screen === "error") {
    return (
      <Box flexDirection="column">
        <Text color="red">error: {state.error}</Text>
        <Text dimColor>press r to retry · q to quit</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" flexGrow={1}>
      <TabBar active={state.tab} width={width} />
      <Box flexGrow={1}>
        <TabContent narrow={isNarrow(width)} width={width} ascii={state.ascii} />
      </Box>
      {state.helpOpen ? <Help tab={state.tab} /> : null}
      <Footer
        rateLimit={state.data.rateLimit}
        storedAt={state.data.storedAt}
        indexVersion={state.data.indexVersion}
        stale={state.data.stale}
      />
    </Box>
  );
}
