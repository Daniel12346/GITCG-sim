import { myAvatarState, myIDState } from "@/recoil/atoms";
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil";
import ImageUpload from "./ImageUpload";
//TODO: default avatar selection
export default function SelectAvatar() {
  const myID = useRecoilValue(myIDState);
  //TODO: does this work?
  const refreshMyAvatar = useRecoilRefresher_UNSTABLE(myAvatarState);
  return (
    <ImageUpload
      uploadPath={`${myID}/avatar.png`}
      bucketName="avatars"
      labelText="Change avatar"
      afterUpload={() => {
        refreshMyAvatar();
      }}
    />
  );
}
