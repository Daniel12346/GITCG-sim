import { myBannerState, myIDState } from "@/recoil/atoms";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";
import ImageUpload from "./ImageUpload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export default function EditBanner() {
  const myID = useRecoilValue(myIDState);
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
