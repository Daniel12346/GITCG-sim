import { myBannerState, myIDState } from "@/recoil/atoms";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";
import ImageUpload from "./ImageUpload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
//TODO: default banner selection
export default function EditBanner() {
  const myID = useRecoilValue(myIDState);
  //TODO: does this work?
  const refreshMyBanner = useRecoilRefresher_UNSTABLE(myBannerState);
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ImageUpload
            uploadPath={`${myID}/banner.png`}
            bucketName="banners"
            iconSrc="/edit_icon.svg"
            afterUpload={() => {
              refreshMyBanner();
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="bg-opacity-90">Edit Banner</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
