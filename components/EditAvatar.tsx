import { myAvatarState, myIDState } from "@/recoil/atoms";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";
import ImageUpload from "./ImageUpload";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
export default function EditAvatar() {
  const myID = useRecoilValue(myIDState);
  const refreshMyAvatar = useRecoilRefresher_UNSTABLE(myAvatarState);
  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger>
          <ImageUpload
            uploadPath={`${myID}/avatar.png`}
            bucketName="avatars"
            iconSrc="/edit_icon.svg"
            afterUpload={() => {
              refreshMyAvatar();
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="bg-opacity-90">
          Edit Avatar
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
