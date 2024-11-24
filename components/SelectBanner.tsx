import { myBannerState, myIDState } from "@/recoil/atoms";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";
import ImageUpload from "./ImageUpload";
//TODO: default banner selection
export default function SelectBanner() {
  const myID = useRecoilValue(myIDState);
  //TODO: does this work?
  const refreshMyBanner = useRecoilRefresher_UNSTABLE(myBannerState);
  return (
    <ImageUpload
      uploadPath={`${myID}/banner.png`}
      bucketName="banners"
      labelText="Change banner"
      afterUpload={() => {
        refreshMyBanner();
      }}
    />
  );
}
