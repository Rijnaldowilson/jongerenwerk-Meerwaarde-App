declare module "react-native-video" {
  import * as React from "react";
    import { ViewProps } from "react-native";

  export interface VideoProperties extends ViewProps {
    source: { uri: string } | number;
    resizeMode?: "cover" | "contain" | "stretch" | "none";
    repeat?: boolean;
    paused?: boolean;
    onEnd?: () => void;
  }

  export default class Video extends React.Component<VideoProperties> {}
}
